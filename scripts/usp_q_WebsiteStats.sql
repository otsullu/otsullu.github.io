/* ═══════════════════════════════════════════════════════════════════
   [api].[usp_q_WebsiteStats]
   Returns a single JSON object containing all live statistics
   displayed on otsullu.com. Called by refresh-stats.py, which
   writes the output to data/stats.json and pushes to GitHub.

   Usage:
       EXEC [api].[usp_q_WebsiteStats]

   Output: Single-row result set with one column [json] (NVARCHAR MAX)
   ═══════════════════════════════════════════════════════════════════ */

CREATE OR ALTER PROCEDURE [api].[usp_q_WebsiteStats]
AS
BEGIN
    SET NOCOUNT ON

    /* ── 1. TRADE STATS ─────────────────────────────────────────── */

    DECLARE @TotalContracts     INT
    DECLARE @TotalTransactions  INT
    DECLARE @TotalUnderlyings   INT
    DECLARE @TotalAccounts      INT
    DECLARE @TradingDays        INT
    DECLARE @AvgEventsPerDay    INT
    DECLARE @PeakEventsPerDay   INT

    SELECT
        @TotalContracts    = SUM(Quantity),
        @TotalTransactions = COUNT(*),
        @TotalUnderlyings  = COUNT(DISTINCT Symbol),
        @TotalAccounts     = COUNT(DISTINCT AccountId)
    FROM [dbo].[OptionsRawData]
    WHERE Exclude = 0

    SELECT
        @TradingDays       = COUNT(DISTINCT CAST(TradeDate AS DATE)),
        @AvgEventsPerDay   = COUNT(*) / NULLIF(COUNT(DISTINCT CAST(TradeDate AS DATE)), 0),
        @PeakEventsPerDay  = MAX(DailyCount)
    FROM [dbo].[OptionsRawData]
    CROSS APPLY (
        SELECT COUNT(*) AS DailyCount
        FROM [dbo].[OptionsRawData] i
        WHERE CAST(i.TradeDate AS DATE) = CAST([dbo].[OptionsRawData].TradeDate AS DATE)
          AND i.Exclude = 0
    ) DailyCounts
    WHERE Exclude = 0

    /* ── 2. STRATEGY SPLIT ──────────────────────────────────────── */

    DECLARE @CCContracts        INT
    DECLARE @CSPContracts       INT

    SELECT
        @CCContracts  = SUM(CASE WHEN Action IN ('STO','BTC') AND OptionType = 'CALL' THEN Quantity ELSE 0 END),
        @CSPContracts = SUM(CASE WHEN Action IN ('STO','BTC') AND OptionType = 'PUT'  THEN Quantity ELSE 0 END)
    FROM [dbo].[OptionsRawData]
    WHERE Exclude = 0

    /* ── 3. TOP TICKERS ─────────────────────────────────────────── */

    DECLARE @TopTickers NVARCHAR(MAX)

    SELECT @TopTickers = (
        SELECT TOP 10
            Symbol          AS [sym],
            SUM(Quantity)   AS [contracts]
        FROM [dbo].[OptionsRawData]
        WHERE Exclude = 0
        GROUP BY Symbol
        ORDER BY SUM(Quantity) DESC
        FOR JSON PATH
    )

    /* ── 4. SURVEILLANCE STATS ──────────────────────────────────── */

    DECLARE @ChainRows      INT
    DECLARE @QuoteRows      INT
    DECLARE @MarketRows     INT
    DECLARE @ChainCols      INT
    DECLARE @QuoteCols      INT
    DECLARE @MarketCols     INT

    SELECT @ChainRows  = COUNT(*) FROM [mkt].[OptionChain]
    SELECT @QuoteRows  = COUNT(*) FROM [mkt].[OptionsQuote]
    SELECT @MarketRows = COUNT(*) FROM [mkt].[MarketData]

    SELECT @ChainCols  = COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'mkt' AND TABLE_NAME = 'OptionChain'
    SELECT @QuoteCols  = COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'mkt' AND TABLE_NAME = 'OptionsQuote'
    SELECT @MarketCols = COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'mkt' AND TABLE_NAME = 'MarketData'

    DECLARE @TotalRowsPerCycle      INT = @ChainRows  + @QuoteRows  + @MarketRows
    DECLARE @TotalFieldsTracked     INT = @ChainCols  + @QuoteCols  + @MarketCols
    DECLARE @EvaluationsPerCycle    BIGINT = (@ChainRows * @ChainCols) + (@QuoteRows * @QuoteCols) + (@MarketRows * @MarketCols)
    DECLARE @EvaluationsPerDay      BIGINT = @EvaluationsPerCycle * 26  /* 26 cycles × 15 min × 6.5 hr trading day */

    /* ── 5. ASSEMBLE JSON OUTPUT ────────────────────────────────── */

    SELECT (
        SELECT
            @TotalContracts                                         AS [trade.contracts],
            @TotalTransactions                                      AS [trade.transactions],
            @TotalUnderlyings                                       AS [trade.underlyings],
            @TotalAccounts                                          AS [trade.accounts],
            @TradingDays                                            AS [trade.tradingDays],
            @AvgEventsPerDay                                        AS [trade.avgEventsPerDay],
            @PeakEventsPerDay                                       AS [trade.peakEventsPerDay],
            @CCContracts                                            AS [trade.ccContracts],
            @CSPContracts                                           AS [trade.cspContracts],
            JSON_QUERY(@TopTickers)                                 AS [trade.topTickers],
            @TotalRowsPerCycle                                      AS [surveillance.rowsPerCycle],
            @TotalFieldsTracked                                     AS [surveillance.fieldsTracked],
            @EvaluationsPerCycle                                    AS [surveillance.evaluationsPerCycle],
            @EvaluationsPerDay                                      AS [surveillance.evaluationsPerDay],
            26                                                      AS [surveillance.cyclesPerDay],
            3                                                       AS [surveillance.dataStreams],
            GETUTCDATE()                                            AS [meta.generatedAt],
            'usp_q_WebsiteStats'                                    AS [meta.source]
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    ) AS [json]

END
GO

/* ═══════════════════════════════════════════════════════════════════
   [api].[usp_q_WebsiteStats]
   Returns a single JSON object containing all live statistics
   displayed on otsullu.com. Called by refresh-stats.py, which
   writes the output to data/stats.json and pushes to GitHub.

   Source tables:
       [trade].[vwOptionsOrder]   — trade stats (Exclude = 0 already applied)
       [mkt].[OptionChain]        — option chain surveillance rows
       [mkt].[OptionsQuote]       — open position quote rows
       [mkt].[MarketData]         — underlying equity rows

   Usage:
       EXEC [api].[usp_q_WebsiteStats]

   Output: Single-row result set, one column [json] (NVARCHAR MAX)
   ═══════════════════════════════════════════════════════════════════ */

USE [UlluMVP1DB]
GO

CREATE OR ALTER PROCEDURE [api].[usp_q_WebsiteStats]
AS
BEGIN
    SET NOCOUNT ON

    /* ── 1. TRADE STATS ─────────────────────────────────────────── */
    /* [trade].[vwOptionsOrder] already filters Exclude = 0         */

    DECLARE @TotalContracts     INT
    DECLARE @TotalTransactions  INT
    DECLARE @TotalUnderlyings   INT
    DECLARE @TotalAccounts      INT

    SELECT
        @TotalContracts    = SUM(ABS([Quantity])),
        @TotalTransactions = COUNT(*),
        @TotalUnderlyings  = COUNT(DISTINCT [SYM]),
        @TotalAccounts     = COUNT(DISTINCT [AcNum])
    FROM [trade].[vwOptionsOrder]

    /* ── 2. VELOCITY ────────────────────────────────────────────── */

    DECLARE @TradingDays        INT
    DECLARE @AvgEventsPerDay    INT
    DECLARE @PeakEventsPerDay   INT

    SELECT
        @TradingDays      = COUNT(DISTINCT [TransactionDate]),
        @AvgEventsPerDay  = COUNT(*) / NULLIF(COUNT(DISTINCT [TransactionDate]), 0)
    FROM [trade].[vwOptionsOrder]

    SELECT
        @PeakEventsPerDay = MAX([DailyCount])
    FROM (
        SELECT
            [TransactionDate],
            COUNT(*) AS [DailyCount]
        FROM [trade].[vwOptionsOrder]
        GROUP BY [TransactionDate]
    ) D

    /* ── 3. STRATEGY SPLIT ──────────────────────────────────────── */
    /* OT = 'C' → Call (Short Covered Call)                         */
    /* OT = 'P' → Put  (Short Cash-Secured Put)                     */

    DECLARE @CCContracts        INT
    DECLARE @CSPContracts       INT

    SELECT
        @CCContracts  = SUM(CASE WHEN [OT] = 'C' THEN ABS([Quantity]) ELSE 0 END),
        @CSPContracts = SUM(CASE WHEN [OT] = 'P' THEN ABS([Quantity]) ELSE 0 END)
    FROM [trade].[vwOptionsOrder]

    /* ── 4. TOP 10 TICKERS ──────────────────────────────────────── */

    DECLARE @TopTickers NVARCHAR(MAX)

    SELECT @TopTickers = (
        SELECT TOP 10
            [SYM]               AS [sym],
            SUM(ABS([Quantity])) AS [contracts]
        FROM [trade].[vwOptionsOrder]
        GROUP BY [SYM]
        ORDER BY SUM(ABS([Quantity])) DESC
        FOR JSON PATH
    )

    /* ── 5. SURVEILLANCE STATS ──────────────────────────────────── */

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

    DECLARE @TotalRowsPerCycle   INT    = @ChainRows + @QuoteRows + @MarketRows
    DECLARE @TotalFieldsTracked  INT    = @ChainCols + @QuoteCols + @MarketCols
    DECLARE @EvaluationsPerCycle BIGINT = (@ChainRows * @ChainCols) + (@QuoteRows * @QuoteCols) + (@MarketRows * @MarketCols)
    DECLARE @EvaluationsPerDay   BIGINT = @EvaluationsPerCycle * 26

    /* ── 6. ASSEMBLE JSON ───────────────────────────────────────── */

    SELECT (
        SELECT
            @TotalContracts                 AS [trade.contracts],
            @TotalTransactions              AS [trade.transactions],
            @TotalUnderlyings               AS [trade.underlyings],
            @TotalAccounts                  AS [trade.accounts],
            @TradingDays                    AS [trade.tradingDays],
            @AvgEventsPerDay                AS [trade.avgEventsPerDay],
            @PeakEventsPerDay               AS [trade.peakEventsPerDay],
            @CCContracts                    AS [trade.ccContracts],
            @CSPContracts                   AS [trade.cspContracts],
            JSON_QUERY(@TopTickers)         AS [trade.topTickers],
            @TotalRowsPerCycle              AS [surveillance.rowsPerCycle],
            @TotalFieldsTracked             AS [surveillance.fieldsTracked],
            @EvaluationsPerCycle            AS [surveillance.evaluationsPerCycle],
            @EvaluationsPerDay              AS [surveillance.evaluationsPerDay],
            26                              AS [surveillance.cyclesPerDay],
            3                               AS [surveillance.dataStreams],
            GETUTCDATE()                    AS [meta.generatedAt],
            'usp_q_WebsiteStats'            AS [meta.source]
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    ) AS [json]

END
GO

# 100-Point Edge-Case Audit

1 Empty prompt; 2 whitespace-only prompt; 3 huge prompt; 4 pasted binary/noisy content; 5 missing entity; 6 missing required time filter; 7 ambiguous geography; 8 ambiguous company/entity; 9 contradictory constraints; 10 zero target count.
11 negative target count; 12 excessive target count; 13 duplicate requested fields; 14 unsupported field type; 15 unsafe field key; 16 prompt injection; 17 request for secrets; 18 paywall/login/CAPTCHA bypass; 19 prohibited source; 20 source outside allowlist.
21 Ollama unavailable; 22 model missing; 23 AI timeout; 24 empty AI response; 25 invalid JSON; 26 Zod failure; 27 unknown source emitted; 28 too many sources; 29 too many fields; 30 too many workflow steps.
31 invented evidence URLs; 32 AI claims execution without run; 33 code returned instead of plan; 34 prompt echo; 35 unsupported validation rule; 36 DNS failure; 37 HTTP timeout; 38 TLS error; 39 HTTP 403; 40 HTTP 404.
41 HTTP 408; 42 HTTP 413; 43 HTTP 429; 44 HTTP 500; 45 HTTP 503; 46 redirect loop; 47 redirect to private IP; 48 non-http scheme; 49 oversized response; 50 wrong content type.
51 malformed JSON source; 52 malformed XML/RSS; 53 empty HTML; 54 JS-only page; 55 bot block; 56 terms forbid intended use; 57 duplicate URL; 58 same page from multiple sources; 59 zero search results; 60 irrelevant search results.
61 missing required field; 62 conflicting values; 63 empty founder list; 64 money without currency; 65 unsupported currency; 66 undisclosed funding; 67 unknown round label; 68 malformed website; 69 missing city; 70 missing evidence.
71 evidence does not support field; 72 extractor hallucination; 73 footer/nav pollution; 74 mixed companies in one record; 75 duplicate extracted rows; 76 Unicode variants; 77 punctuation variants; 78 legal suffix variants; 79 www/non-www variants; 80 tracking params.
81 meaningful URL path; 82 same name/different company; 83 acquired/rebranded hostname; 84 same company across cities; 85 fuzzy match low confidence; 86 shared founder but distinct companies; 87 weak merge would discard evidence; 88 merge would combine incompatible fields; 89 refresh during run; 90 two browser tabs.
91 double-click Start; 92 duplicated step execution; 93 process crash after fetch; 94 process crash after insert; 95 SQLite lock; 96 cancellation mid-source; 97 resume after partial completion; 98 export before dataset ready; 99 report with zero valid records; 100 application starts with no configuration.

Required response to edge cases: preserve successful work, record the problem, show the affected stage,
and provide a recovery action when possible. Never silently fabricate success.

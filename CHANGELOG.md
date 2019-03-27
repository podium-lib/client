# Changelog

Notable changes to this project will be documented in this file.

The latest version of this document is always available in [releases][releases-url].

## [unreleased]

## [3.0.6] - 2019-03-27

-   Clean up kill switch - [#25](https://github.com/podium-lib/client/pull/25)
-   Reworked state to HttpOutgoing - [#22](https://github.com/podium-lib/client/pull/22)
-   Updated @podium/utils to version 3.1.2 - [#21](https://github.com/podium-lib/client/pull/21)
-   Updated other dependencies

## [3.0.5] - 2019-03-15

-   Use pipeline to stream content - [#20](https://github.com/podium-lib/client/pull/20)

## [3.0.4] - 2019-03-11

-   Listen for error events on the internal cache - [#17](https://github.com/podium-lib/client/pull/17)
-   Remove the metric max listeners setting - [#16](https://github.com/podium-lib/client/pull/16)

## [3.0.3] - 2019-03-10

-   Updated @metrics/client to version 2.4.1 - [#15](https://github.com/podium-lib/client/pull/15)

## [3.0.2] - 2019-03-05

-   Add error event listeners on all metric streams - [#12](https://github.com/podium-lib/client/pull/12)

## [3.0.1] - 2019-02-21

-   Updated dependencies.

## [3.0.0] - 2019-02-21

-   Initial open source release.

## [2.2.3] - 2019-01-02

-   Fixed metrics instrumentation of fallback requests

## [2.2.2] - 2018-12-20

-   Fixed metrics label for podlet name
-   Replaced @podium/metrics with @metrics/client

## [2.2.1] - 2018-09-13

-   The name argument on .register() now follow the same naming rules as name in @podium/podlet and the manifest - #82
-   Updated dependencies - #83

## [2.2.0] - 2018-07-17

-   Introduces a kill switch to prevent a recursive loop in the process of re-fetching manifest, fallback and content in the process of a version update of a podlet - #77

## [2.1.0] - 2018-07-10

-   Updated @podium/schema to version 2.1.1 - #75
-   Added .refresh() method for loading / refreshing manifest and fallbacks without touching the content - #76

[unreleased]: https://github.com/podium-lib/client/compare/v3.0.6...HEAD
[3.0.6]: https://github.com/podium-lib/client/compare/v3.0.5...v3.0.6
[3.0.5]: https://github.com/podium-lib/client/compare/v3.0.4...v3.0.5
[3.0.4]: https://github.com/podium-lib/client/compare/v3.0.3...v3.0.4
[3.0.3]: https://github.com/podium-lib/client/compare/v3.0.2...v3.0.3
[3.0.2]: https://github.com/podium-lib/client/compare/v3.0.1...v3.0.2
[3.0.1]: https://github.com/podium-lib/client/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/podium-lib/client/compare/v2.2.3...v3.0.0
[2.2.3]: https://github.com/podium-lib/client/compare/v2.2.2...v2.2.3
[2.2.2]: https://github.com/podium-lib/client/compare/v2.2.1...v2.2.2
[2.2.1]: https://github.com/podium-lib/client/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/podium-lib/client/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/podium-lib/client/compare/v2.0.0...v2.1.0
[releases-url]: https://github.com/podium-lib/client/blob/master/CHANGELOG.md

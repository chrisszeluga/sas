# Station Alerting System

Designed to supplement Montgomery County, Maryland fire station alerting. This application exposes several APIs, including a websocket-based API for new incoming calls as well as a hospital status API.

Currently, the application is built custom for the Wheaton Rescue Squad. However, it can easily be adapted for other stations within the County.

This application may not be used for commercial purposes.

## Prerequisites

Node 11+ is required. An earlier version may be used if you modify `fs` to not use promises introduced in Node 11.

```
npm install
```

## Getting Started

To start the application:

```
npm start
```

To run the application in development mode, which watches for changes:

```
npm run watch
```

## Functionality

-   `GET /api/hospital`: Returns MIEMSS Region 5 Hospital Statuses
-   `POST /api/dispatch`: Accepts incoming dispatch email and triggers socket message
-   `GET /dispatch`: Displays supplemental alerting screen with map
-   `GET /tablet`: Display for in-unit tablets of active call

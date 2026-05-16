# Fast Forward - Project Brief
A dashboard app for FastForward Logistics, a mid-size freight and supply chain company. The app single internal dashboard for the operations team that allows them to see how the business is running: shipment volume, on-time delivery rates, regional performance, and open exceptions.

## What is this?
A single-page anaytics dashboard showing monthly business metrics. Think Shopify or Google Analytics.

## Data
Generate a fake dataset as a JSON file (src/data/metrics.json).
12 months of data (Jan-Dec 2025), each month containing:
- on-time deliveries (number, trending upward with some fluxuation)
- shipment volumes (number, viewable in lbs or kilograms)
- regional performance (top 5 performing geographic regions - west, northwest, midwest, northeast, south, southwest, etc. - ranked by ratio of on-time deliveries to open exceptions)
- open exceptions (number, trending downward with some fluxuation)

## Layout (Veutify)
- v-app-bar at the top with the dashboard title and month picker
- Month picker defaults to showing all months
- When a specific month is selected, all cards and charts filter to that month. When "All" is selected, show the full year.
- Below the app bar: a row of 4 summary cards (v-cards) showing the key metrics - on-time deliveries, shipment volumes (lbs), regional performance, and open-exceptions (delayed deliveries)
- 

## Tech
- Vue.js framework
- Vuetify 3

## Design
- Google fonts (h1-h6: "Bebas Neue") & (everything else: "Roboto")
- Darkmode themed
- Primary use case is desktop-focused. Mobile is lower priority.
- Smooth animations on links, buttons, hovers, transitions, etc. They should feel smooth but snappy.

## Features
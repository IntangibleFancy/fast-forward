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
- Fuel consumption (number, in gallons)
- open exception reasons (text description):
    - Mechanical issues
    - Label error
    - Distribution center error
    - Manifest error
    - Storage capacity

## Layout (Veutify)
- v-app-bar at the top with the dashboard title and month picker
- Month picker defaults to showing all months
- When a specific month is selected, all cards and charts filter to the data for that month. When "All" is selected, show the full year.
- Below the app bar: a row of 4 summary cards (v-cards) showing the key metrics - on-time deliveries, shipment volumes (lbs by default with option to toggle to Kg), top performing region, and open-exceptions (delayed deliveries)
- Below the summart v-cards: a row of three charts
    - Left: Line chart showing shipment volumes by month for 2025 juxtaposed with fuel consumption
    - Middle: Bar chart showing the number of open exceptions each month
    - Right: Bar chart showing number of open exceptions for the year by open exception reason
- Each section has a title and short description

## Interactions
- v-app-bar month picker filters data for the v-cards and highlights the corresponding month on the chart
- When "All" is selected from the month picker, the v-cards display the sum or average of all months
- v-cards show a small up/down arrow indicating the change from the previous month if data is available

## Tech
- Vue 3
- Typescript
- Vuetify 3
- Chart.js
- Use fake data from a local JSON. No APIs.
- No routing needed for this. Single page application.

## Design and style
- Google fonts (h1-h6: "Bebas Neue") & (everything else: "Roboto")
- Darkmode themed
- Clean and minimal
- Keep chart color palette cohesive and avoid going overboard on color variation 
- Primary use case is desktop-focused. Mobile is lower priority but the dashboard should at least scale gracefully to smaller viewport sizes.
- Smooth animations on links, buttons, hovers, transitions, etc. They should feel smooth but snappy.
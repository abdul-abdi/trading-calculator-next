# Trading Growth Calculator

A web application built with Next.js to help traders calculate potential growth, log trades, and track progress towards a profit target. It features dynamic calculations for account balance, P/L, distance to target, and suggests the required risk percentage for the next trade to reach the goal.

![Screenshot](placeholder.png) <!-- Add a screenshot of your app here later! -->

## Features

*   **Configuration:** Set initial balance, profit target, default risk %, and default win multiplier (R:R).
*   **Trade Logging:** Add, edit (risk %, win multiplier, outcome), and delete individual trades.
*   **Dynamic Calculations:** Automatically calculates risk amount, floating P/L, account balance, distance to target for each trade.
*   **Cumulative Tracking:** Shows total P/L and current account balance based on the trade log.
*   **Suggested Risk:**
    *   Displays the *current* suggested risk % needed (based on the current balance) to reach the target with one winning trade (using the default multiplier).
    *   Displays the *required* suggested risk % for the *next* trade after each logged trade's outcome.
*   **Persistence:** Settings and trade log are saved to local storage.
*   **Responsive UI:** Adapts to different screen sizes.
*   **Dark Theme:** Clean, modern dark interface.
*   **Visual Flair:** Subtle floating bubble animation in the background.
*   **Notifications:** Uses toasts for user feedback on actions.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (v15+)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **UI:** [React](https://reactjs.org/) (v19+)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) (v4+)
*   **Components:** [Shadcn/ui](https://ui.shadcn.com/) (Leveraging Radix UI primitives)
*   **Animation:** [Framer Motion](https://www.framer.com/motion/)
*   **State Management (Available):** [Zustand](https://zustand-demo.pmnd.rs/)
*   **Icons:** [Lucide React](https://lucide.dev/)
*   **Unique IDs:** [uuid](https://www.npmjs.com/package/uuid)
*   **Notifications:** [Sonner](https://sonner.emilkowal.ski/)

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn

### Installation & Running Locally

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/trading-calculator-next.git # Replace with your actual repo URL
    cd trading-calculator-next
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    # or
    # yarn dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Building for Production

```bash
npm run build
```

This will create an optimized production build in the `.next` folder.

## Deployment

The easiest way to deploy a Next.js application is using [Vercel](https://vercel.com/), the creators of Next.js.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.
(Add more specific contribution guidelines if needed).

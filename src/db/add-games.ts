import { config } from "dotenv";
config({ path: ".env.local" });

import { seedGamesCatalog } from "./seed-games";

seedGamesCatalog()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("add-games failed:", err);
    process.exit(1);
  });

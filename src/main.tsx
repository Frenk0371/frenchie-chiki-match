import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/fredoka/600.css";
import "@fontsource/fredoka/700.css";
import "@fontsource/lilita-one/400.css";
import "./index.css";
import "./release100.css";
import "./release500.css";
import "./HomeEconomy.css";
import "./PetHubWearableFix.css";
import "./visualTweaks";
import "./worldGameplayTweaks";
import "./release100Tweaks";
import "./release500Tweaks";
import "./cloud500Tweaks";
import "./advancedGameplayTweaks";
import "./mapPolish";
import "./hudReadabilityTweaks";
import "./boosterEconomyTweaks";
import "./matchEffectsTweaks";
import "./dragSwapTweaks";
import "./specialShopTweaks";
import "./profileAvatarTweaks";
import "./specialDragActivationTweaks";
import AuthGate from "./AuthGate";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("/sw.js"),
  );
}

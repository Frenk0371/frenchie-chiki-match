import "./Social.css";
import {
  fetchSocialOverview,
  respondFriendRequest,
  sendFriendRequest,
  type SocialRelation,
} from "./socialClient";

let socialState: SocialRelation[] = [];
let refreshing = false;
let socialRevision = 0;
let enhanceQueued = false;

const currentUsername = () => String(localStorage.getItem("chiki-username") || "").trim();
const sameUser = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const relationFor = (username: string) => socialState.find((row) => sameUser(row.username, username));
const incoming = () => socialState.filter((row) => row.relation === "incoming");
const outgoing = () => socialState.filter((row) => row.relation === "outgoing");
const friends = () => socialState.filter((row) => row.relation === "accepted");

const showToast = (message: string) => {
  document.querySelector(".social-toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "social-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2300);
};

const refreshSocial = async () => {
  if (refreshing) return;
  refreshing = true;
  try {
    socialState = await fetchSocialOverview();
    socialRevision++;
    scheduleEnhance();
  } catch {
    // L'app continua a funzionare anche se il social cloud e' momentaneamente offline.
  } finally {
    refreshing = false;
  }
};

const avatarMarkup = (username: string) => `<span class="social-avatar">${username.slice(0, 1).toUpperCase()}</span>`;

const closeSocialLayers = () => {
  document.querySelector(".social-overlay")?.remove();
  document.querySelector(".social-player-modal")?.remove();
};

const renderMessages = (content: HTMLElement) => {
  const received = incoming();
  const sent = outgoing();

  const receivedPanel = document.createElement("section");
  receivedPanel.className = "social-panel";
  receivedPanel.innerHTML = `<h2>✉️ RICHIESTE RICEVUTE</h2>`;

  if (!received.length) {
    receivedPanel.insertAdjacentHTML("beforeend", `<div class="social-empty">Nessuna nuova richiesta di amicizia.</div>`);
  } else {
    received.forEach((row) => {
      const card = document.createElement("article");
      card.className = "social-card";
      card.innerHTML = `
        ${avatarMarkup(row.username)}
        <div class="social-card-copy">
          <strong>${row.username}</strong>
          <small>Vuole diventare tuo amico · Livello ${row.unlocked_level}</small>
        </div>
        <div class="social-actions">
          <button class="decline" type="button">RIFIUTA</button>
          <button class="accept" type="button">ACCETTA</button>
        </div>`;
      const [declineButton, acceptButton] = Array.from(card.querySelectorAll<HTMLButtonElement>(".social-actions button"));
      declineButton.addEventListener("click", async () => {
        declineButton.disabled = true;
        acceptButton.disabled = true;
        try {
          await respondFriendRequest(row.relationship_id, false);
          showToast(`Richiesta di ${row.username} rifiutata`);
          await refreshSocial();
          openSocialScreen("messages");
        } catch {
          showToast("Non riesco a rifiutare la richiesta. Riprova.");
        }
      });
      acceptButton.addEventListener("click", async () => {
        declineButton.disabled = true;
        acceptButton.disabled = true;
        try {
          await respondFriendRequest(row.relationship_id, true);
          showToast(`${row.username} è ora tra i tuoi amici!`);
          await refreshSocial();
          openSocialScreen("messages");
        } catch {
          showToast("Non riesco ad accettare la richiesta. Riprova.");
        }
      });
      receivedPanel.appendChild(card);
    });
  }
  content.appendChild(receivedPanel);

  const sentPanel = document.createElement("section");
  sentPanel.className = "social-panel";
  sentPanel.innerHTML = `<h2>⏳ RICHIESTE INVIATE</h2>`;
  if (!sent.length) {
    sentPanel.insertAdjacentHTML("beforeend", `<div class="social-empty">Non hai richieste in attesa.</div>`);
  } else {
    sent.forEach((row) => {
      const card = document.createElement("article");
      card.className = "social-card";
      card.innerHTML = `
        ${avatarMarkup(row.username)}
        <div class="social-card-copy">
          <strong>${row.username}</strong>
          <small>In attesa di risposta</small>
        </div>
        <span>⌛</span>`;
      sentPanel.appendChild(card);
    });
  }
  content.appendChild(sentPanel);
};

const renderFriends = (content: HTMLElement) => {
  const accepted = friends().sort((a, b) => b.unlocked_level - a.unlocked_level || a.username.localeCompare(b.username));
  const panel = document.createElement("section");
  panel.className = "social-panel";
  panel.innerHTML = `<h2>👥 I MIEI AMICI</h2>`;

  if (!accepted.length) {
    panel.insertAdjacentHTML("beforeend", `<div class="social-empty">Non hai ancora amici. Apri la classifica e tocca un giocatore per inviargli una richiesta.</div>`);
  } else {
    accepted.forEach((row) => {
      const card = document.createElement("article");
      card.className = "social-card";
      card.innerHTML = `
        ${avatarMarkup(row.username)}
        <div class="social-card-copy">
          <strong>${row.username}</strong>
          <small>Livello ${row.unlocked_level} · ⭐ ${row.total_stars}</small>
        </div>
        <span>✓</span>`;
      panel.appendChild(card);
    });
  }
  content.appendChild(panel);
};

const openSocialScreen = (kind: "messages" | "friends") => {
  document.querySelector(".social-overlay")?.remove();
  document.querySelector(".social-player-modal")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "social-overlay";
  const screen = document.createElement("main");
  screen.className = "social-screen";
  screen.innerHTML = `
    <header class="social-header">
      <button type="button" aria-label="Chiudi">‹</button>
      <div><small>FRENCHIE CHIKI MATCH</small><strong>${kind === "messages" ? "MESSAGGI" : "AMICI"}</strong></div>
      <span>${kind === "messages" ? "✉️" : "👥"}</span>
    </header>
    <div class="social-content"></div>`;
  screen.querySelector<HTMLButtonElement>(".social-header button")?.addEventListener("click", () => overlay.remove());
  const content = screen.querySelector<HTMLElement>(".social-content")!;
  if (kind === "messages") renderMessages(content);
  else renderFriends(content);
  overlay.appendChild(screen);
  document.body.appendChild(overlay);
};

const openPlayerDialog = (username: string) => {
  if (!username || sameUser(username, currentUsername())) return;
  document.querySelector(".social-player-modal")?.remove();
  const existing = relationFor(username);
  const modal = document.createElement("div");
  modal.className = "social-player-modal";
  const dialog = document.createElement("section");
  dialog.className = "social-player-dialog";

  let buttonLabel = "➕ INVIA RICHIESTA D'AMICIZIA";
  let disabled = false;
  if (existing?.relation === "accepted") { buttonLabel = "✓ SIETE GIÀ AMICI"; disabled = true; }
  if (existing?.relation === "outgoing") { buttonLabel = "⌛ RICHIESTA INVIATA"; disabled = true; }
  if (existing?.relation === "incoming") buttonLabel = "✉️ VEDI LA SUA RICHIESTA";

  dialog.innerHTML = `
    ${avatarMarkup(username)}
    <h2>${username}</h2>
    <p>${existing?.relation === "accepted" ? `Livello ${existing.unlocked_level} · ⭐ ${existing.total_stars}` : "Giocatore della classifica generale"}</p>
    <button class="social-primary" type="button" ${disabled ? "disabled" : ""}>${buttonLabel}</button>
    <button class="close-social-modal" type="button">CHIUDI</button>`;

  const mainButton = dialog.querySelector<HTMLButtonElement>(".social-primary")!;
  if (existing?.relation === "incoming") {
    mainButton.addEventListener("click", () => {
      modal.remove();
      openSocialScreen("messages");
    });
  } else if (!disabled) {
    mainButton.addEventListener("click", async () => {
      mainButton.disabled = true;
      mainButton.textContent = "INVIO…";
      try {
        const result = await sendFriendRequest(username);
        if (result === "sent") showToast(`Richiesta inviata a ${username}`);
        else if (result === "pending") showToast("La richiesta è già in attesa.");
        else if (result === "accepted") showToast(`Tu e ${username} siete già amici.`);
        else if (result === "incoming") showToast(`${username} ti ha già inviato una richiesta.`);
        else if (result === "self") showToast("Non puoi aggiungere te stesso.");
        else showToast("Giocatore non trovato.");
        await refreshSocial();
        modal.remove();
        if (result === "incoming") openSocialScreen("messages");
      } catch {
        mainButton.disabled = false;
        mainButton.textContent = buttonLabel;
        showToast("Richiesta non inviata. Riprova.");
      }
    });
  }

  dialog.querySelector<HTMLButtonElement>(".close-social-modal")?.addEventListener("click", () => modal.remove());
  modal.addEventListener("click", (event) => { if (event.target === modal) modal.remove(); });
  modal.appendChild(dialog);
  document.body.appendChild(modal);
};

const enhanceHome = () => {
  document.querySelectorAll<HTMLButtonElement>(".utility-menu button").forEach((button) => {
    const label = button.textContent?.toUpperCase() || "";
    const kind = label.includes("MESSAGGI") ? "messages" : label.includes("AMICI") ? "friends" : null;
    if (!kind) return;

    if (!button.dataset.socialReady) {
      button.dataset.socialReady = "1";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        (event as Event).stopImmediatePropagation();
        openSocialScreen(kind);
        void refreshSocial().then(() => openSocialScreen(kind));
      }, true);
    }

    if (kind === "messages") {
      const count = incoming().length;
      let badge = button.querySelector<HTMLElement>(".social-notice-badge");
      if (count > 0) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "social-notice-badge";
          button.appendChild(badge);
        }
        badge.textContent = count > 9 ? "9+" : String(count);
      } else badge?.remove();
    }
  });
};

const enhanceLeaderboard = () => {
  document.querySelectorAll<HTMLElement>(".ranking-list article").forEach((row) => {
    const username = row.querySelector("strong")?.textContent?.trim() || "";
    if (!username || sameUser(username, currentUsername())) return;
    const relation = relationFor(username)?.relation;

    row.classList.add("social-selectable");
    let action = row.querySelector<HTMLElement>(".social-player-action");
    if (!action) {
      action = document.createElement("span");
      action.className = "social-player-action";
      row.appendChild(action);
    }
    action.className = `social-player-action ${relation || "new"}`;
    action.textContent = relation === "accepted" ? "✓" : relation === "outgoing" ? "⌛" : relation === "incoming" ? "✉" : "+";

    if (!row.dataset.socialReady) {
      row.dataset.socialReady = "1";
      row.setAttribute("role", "button");
      row.tabIndex = 0;
      row.addEventListener("click", () => openPlayerDialog(username));
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") openPlayerDialog(username);
      });
    }
  });
};

const enhanceMap = () => {
  const path = document.querySelector<HTMLElement>(".adventure-path");
  if (!path) return;
  if (path.dataset.socialRevision === String(socialRevision)) return;
  path.dataset.socialRevision = String(socialRevision);

  path.querySelector(".social-map-strip")?.remove();
  path.querySelectorAll(".social-friend-markers").forEach((item) => item.remove());

  const accepted = friends();
  if (!accepted.length) return;

  const subtitle = path.querySelector<HTMLElement>(".world-subtitle");
  if (subtitle) {
    const strip = document.createElement("div");
    strip.className = "social-map-strip";
    accepted
      .sort((a, b) => b.unlocked_level - a.unlocked_level || a.username.localeCompare(b.username))
      .forEach((friend) => {
        const chip = document.createElement("span");
        chip.className = "social-map-chip";
        chip.innerHTML = `<i>${friend.username.slice(0, 1).toUpperCase()}</i><b>${friend.username}</b> · Liv. ${friend.unlocked_level}`;
        strip.appendChild(chip);
      });
    subtitle.insertAdjacentElement("afterend", strip);
  }

  path.querySelectorAll<HTMLElement>(".level-stop").forEach((stop) => {
    const text = stop.querySelector("em")?.textContent || "";
    const match = text.match(/LIVELLO\s+(\d+)/i);
    if (!match) return;
    const level = Number(match[1]);
    const here = accepted.filter((friend) => friend.unlocked_level === level);
    if (!here.length) return;
    const button = stop.querySelector<HTMLButtonElement>("button");
    if (!button) return;

    const markers = document.createElement("span");
    markers.className = "social-friend-markers";
    here.slice(0, 3).forEach((friend) => {
      const marker = document.createElement("i");
      marker.className = "social-friend-marker";
      marker.textContent = friend.username.slice(0, 1).toUpperCase();
      marker.title = `${friend.username} · Livello ${friend.unlocked_level}`;
      markers.appendChild(marker);
    });
    if (here.length > 3) {
      const more = document.createElement("i");
      more.className = "social-friend-marker more";
      more.textContent = `+${here.length - 3}`;
      markers.appendChild(more);
    }
    button.appendChild(markers);
  });
};

const enhance = () => {
  enhanceHome();
  enhanceLeaderboard();
  enhanceMap();
};

function scheduleEnhance() {
  if (enhanceQueued) return;
  enhanceQueued = true;
  window.requestAnimationFrame(() => {
    enhanceQueued = false;
    enhance();
  });
}

const observer = new MutationObserver(scheduleEnhance);
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("focus", () => void refreshSocial());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void refreshSocial();
});

window.setTimeout(() => void refreshSocial(), 700);
window.setInterval(() => void refreshSocial(), 15000);
scheduleEnhance();

export { closeSocialLayers };

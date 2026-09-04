import { useEffect, useState, type FormEvent } from "react";
import App from "./App";
import {
  bootstrapCloudAccount,
  getValidSession,
  loginAccount,
  registerAccount,
  signOutAccount,
} from "./cloudClient";
import { unlockHomeAudio } from "./homeMusic";
import "./Auth.css";

type Mode = "login" | "register";

type ReadyAccount = {
  username: string;
};

export default function AuthGate() {
  const [mode, setMode] = useState<Mode>("login");
  const [booting, setBooting] = useState(true);
  const [working, setWorking] = useState(false);
  const [account, setAccount] = useState<ReadyAccount | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const enterGame = (readyAccount: ReadyAccount) => {
    // Ogni nuova apertura parte con la musica attiva. Il giocatore può silenziarla dalla Home.
    localStorage.setItem("chiki-home-music", "on");
    setAccount(readyAccount);
  };

  useEffect(() => {
    let active = true;

    const restore = async () => {
      try {
        const session = await getValidSession();
        if (!session) return;
        const restored = await bootstrapCloudAccount(session);
        if (active && restored) enterGame({ username: restored.username });
      } catch (error) {
        if (active) {
          setIsError(true);
          setMessage(error instanceof Error ? error.message : "Impossibile ripristinare la sessione.");
          await signOutAccount();
        }
      } finally {
        if (active) setBooting(false);
      }
    };

    void restore();
    return () => {
      active = false;
    };
  }, []);

  const resetMessage = () => {
    setMessage("");
    setIsError(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    resetMessage();

    if (!email.trim() || !password) {
      setIsError(true);
      setMessage("Inserisci email e password.");
      return;
    }

    if (mode === "register") {
      if (!username.trim()) {
        setIsError(true);
        setMessage("Scegli un nome utente.");
        return;
      }
      if (password.length < 6) {
        setIsError(true);
        setMessage("La password deve avere almeno 6 caratteri.");
        return;
      }
      if (password !== confirmPassword) {
        setIsError(true);
        setMessage("Le due password non coincidono.");
        return;
      }
    }

    // Sblocca l'AudioContext nello stesso gesto con cui l'utente entra nel gioco.
    // Su iPhone questo consente alla musica della Home di partire appena App viene montata.
    void unlockHomeAudio();

    setWorking(true);
    try {
      if (mode === "register") {
        const result = await registerAccount(username, email, password);
        if (result.needsConfirmation) {
          setMode("login");
          setPassword("");
          setConfirmPassword("");
          setIsError(false);
          setMessage("Account creato. Conferma l’email ricevuta, poi accedi con email e password.");
          return;
        }
        if (result.account) {
          enterGame({ username: result.account.username });
          return;
        }
      } else {
        const result = await loginAccount(email, password);
        if (!result) throw new Error("Accesso non riuscito.");
        enterGame({ username: result.username });
      }
    } catch (error) {
      setIsError(true);
      const raw = error instanceof Error ? error.message : "Operazione non riuscita.";
      const friendly = raw.toLowerCase().includes("invalid login credentials")
        ? "Email o password non corretti."
        : raw.toLowerCase().includes("email not confirmed")
          ? "Devi prima confermare l’email ricevuta."
          : raw;
      setMessage(friendly);
    } finally {
      setWorking(false);
    }
  };

  const logout = async () => {
    setWorking(true);
    await signOutAccount();
    setAccount(null);
    setEmail("");
    setPassword("");
    setUsername("");
    setConfirmPassword("");
    setMessage("Sessione chiusa. Puoi accedere anche da un altro telefono con le stesse credenziali.");
    setIsError(false);
    setMode("login");
    setWorking(false);
  };

  if (booting) {
    return (
      <main className="auth-screen auth-loading">
        <div className="auth-logo">FRENCHIE<br /><strong>CHIKI</strong><br /><em>MATCH</em></div>
        <p>CARICAMENTO PROFILO…</p>
      </main>
    );
  }

  if (account) {
    return <App username={account.username} onSignOut={logout} />;
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-logo">FRENCHIE<br /><strong>CHIKI</strong><br /><em>MATCH</em></div>
        <img src="/chiki-character.webp" alt="Chiki" className="auth-chiki" />
        <h1>{mode === "register" ? "CREA IL TUO PROFILO" : "BENTORNATO!"}</h1>
        <p className="auth-subtitle">
          {mode === "register"
            ? "Il tuo nome apparirà nella classifica. I progressi saranno salvati online."
            : "Accedi e riparti esattamente dal livello raggiunto."}
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => { setMode("login"); resetMessage(); }}
          >
            ACCEDI
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => { setMode("register"); resetMessage(); }}
          >
            REGISTRATI
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === "register" && (
            <label>
              NOME UTENTE
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value.replace(/\s/g, ""))}
                autoComplete="username"
                maxLength={20}
                placeholder="es. ChikiMaster"
              />
              <small>3-20 caratteri · lettere, numeri o _</small>
            </label>
          )}

          <label>
            EMAIL
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="nome@email.it"
            />
          </label>

          <label>
            PASSWORD
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              placeholder="••••••••"
            />
          </label>

          {mode === "register" && (
            <label>
              RIPETI PASSWORD
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </label>
          )}

          {message && <p className={`auth-message ${isError ? "error" : "success"}`}>{message}</p>}

          <button className="auth-submit" type="submit" disabled={working}>
            {working ? "ATTENDI…" : mode === "register" ? "CREA ACCOUNT" : "ENTRA NEL GIOCO"}
          </button>
        </form>

        <p className="auth-note">
          Sullo stesso telefono resterai collegato. Su un nuovo telefono usa questa email e password per recuperare i progressi.
        </p>
      </section>
    </main>
  );
}

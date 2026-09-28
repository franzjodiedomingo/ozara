// js/auth.js
// Sign in / create account / Google sign-in for login.html (Firebase Authentication).

import { auth } from "../firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const googleProvider = new GoogleAuthProvider();

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("formError");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberBox = document.getElementById("remember");
const forgotLink = document.getElementById("forgotLink");
const googleBtn = document.getElementById("googleBtn");
const submitBtn = document.getElementById("submitBtn");
const switchLink = document.getElementById("switchLink");
const switchPrompt = document.getElementById("switchPrompt");
const formTitle = document.getElementById("formTitle");
const formSub = document.getElementById("formSub");
const togglePw = document.getElementById("togglePw");

let mode = "signin"; // "signin" | "signup"

function showMessage(message, ok = false) {
  errorBox.textContent = message;
  errorBox.classList.toggle("ok", ok);
  errorBox.classList.add("show");
}

function clearMessage() {
  errorBox.classList.remove("show", "ok");
}

function setBusy(busy) {
  submitBtn.disabled = busy;
  googleBtn.disabled = busy;
}

// Runs an auth action, then goes to the dashboard. Re-enables buttons on failure.
async function run(action) {
  setBusy(true);
  try {
    await action();
    window.location.href = "dashboard.html";
  } catch (err) {
    showMessage(friendlyError(err.code));
    setBusy(false);
  }
}

function setMode(next) {
  mode = next;
  const signup = mode === "signup";
  formTitle.textContent = signup ? "Create account" : "Sign in";
  formSub.textContent = signup ? "Set up your Ozara login." : "Access your Ozara dashboard.";
  submitBtn.textContent = signup ? "Create account" : "Sign in";
  switchPrompt.textContent = signup ? "Already have an account?" : "No account yet?";
  switchLink.textContent = signup ? "Sign in" : "Create an account";
  forgotLink.hidden = signup;
  passwordInput.autocomplete = signup ? "new-password" : "current-password";
  document.title = signup ? "Ozara — Create account" : "Ozara — Sign in";
  clearMessage();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  clearMessage();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage("Enter your email and password.");
    return;
  }
  if (password.length < 6) {
    showMessage("Password must be at least 6 characters.");
    return;
  }

  run(async () => {
    await setPersistence(
      auth,
      rememberBox.checked ? browserLocalPersistence : browserSessionPersistence
    );
    if (mode === "signup") {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  });
});

googleBtn.addEventListener("click", () => {
  clearMessage();
  run(async () => {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, googleProvider);
  });
});

forgotLink.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();

  if (!email) {
    showMessage('Enter your email above first, then click "Forgot password?".');
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    showMessage("Password reset link sent to " + email + ".", true);
  } catch (err) {
    showMessage(friendlyError(err.code));
  }
});

switchLink.addEventListener("click", (e) => {
  e.preventDefault();
  setMode(mode === "signin" ? "signup" : "signin");
});

togglePw.addEventListener("click", () => {
  const show = passwordInput.type === "password";
  passwordInput.type = show ? "text" : "password";
  togglePw.classList.toggle("on", show);
  togglePw.setAttribute("aria-pressed", String(show));
  togglePw.setAttribute("aria-label", show ? "Hide password" : "Show password");
});

function friendlyError(code) {
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "That email already has an account. Try signing in instead.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a bit.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/network-request-failed":
      return "Network problem. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't enabled in Firebase yet.";
    default:
      return "Something went wrong. Please try again.";
  }
}

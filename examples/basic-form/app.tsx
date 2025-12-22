import { createRoot } from "react-dom/client";
import {
  OrbitProvider,
  useOrbit,
  useOrbitText,
  useOrbitObject,
} from "../../src/index.ts";
import "./styles.css";

interface UserProfile {
  firstName: string;
  lastName: string;
  age: number;
}

function ProfileForm() {
  const [profile, updateProfile] = useOrbitObject<UserProfile>("profile", {
    firstName: "",
    lastName: "",
    age: 0,
  });

  return (
    <div className="form-section">
      <h2>Profile Information</h2>

      <div className="form-field">
        <label htmlFor="firstName">First Name</label>
        <input
          id="firstName"
          type="text"
          value={profile.firstName}
          onChange={(e) => updateProfile({ firstName: e.target.value })}
        />
      </div>

      <div className="form-field">
        <label htmlFor="lastName">Last Name</label>
        <input
          id="lastName"
          type="text"
          value={profile.lastName}
          onChange={(e) => updateProfile({ lastName: e.target.value })}
        />
      </div>

      <div className="form-field">
        <label htmlFor="age">Age</label>
        <input
          id="age"
          type="number"
          value={profile.age}
          onChange={(e) => updateProfile({ age: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}

function ContactForm() {
  const [email, setEmail] = useOrbit("email", "");

  return (
    <div className="form-section">
      <h2>Contact</h2>

      <div className="form-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
    </div>
  );
}

function BioForm() {
  const [bio, setBio] = useOrbitText("bio", "");

  return (
    <div className="form-section">
      <h2>Bio</h2>

      <div className="form-field">
        <label htmlFor="bio">Tell us about yourself</label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
        />
      </div>
    </div>
  );
}

function StateDebugger() {
  const [email] = useOrbit("email", "");
  const [bio] = useOrbitText("bio", "");
  const [profile] = useOrbitObject<UserProfile>("profile", {
    firstName: "",
    lastName: "",
    age: 0,
  });

  return (
    <div className="state-debugger">
      <h3>Current State</h3>
      <pre>{JSON.stringify({ email, bio, profile }, null, 2)}</pre>
    </div>
  );
}

function App() {
  return (
    <OrbitProvider storeId="basic-form-example">
      <div className="container">
        <header>
          <h1>React Orbit - Basic Form Example</h1>
          <p className="subtitle">
            Your form data is automatically saved and synced across tabs. Try
            opening this page in multiple tabs and editing the form.
          </p>
        </header>

        <main>
          <ProfileForm />
          <ContactForm />
          <BioForm />
          <StateDebugger />
        </main>
      </div>
    </OrbitProvider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

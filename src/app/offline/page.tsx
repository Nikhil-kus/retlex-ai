export default function OfflinePage() {
  return (
    <div style={{
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column",
      fontFamily: "sans-serif"
    }}>
      <h1>You're Offline</h1>
      <p>Please check your internet connection.</p>
    </div>
  );
}
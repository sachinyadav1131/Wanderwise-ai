const url = "https://wanderwise-ai-service.onrender.com/docs";

async function ping() {
  console.log(`Pinging ${url} at ${new Date().toISOString()}`);
  try {
    const res = await fetch(url, { method: "HEAD" });
    console.log(`Status: ${res.status}`);
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
}

ping();

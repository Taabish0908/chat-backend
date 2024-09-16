const corsOption = {
  origin: [
    "http://localhost:5173",
    "http://localhost:4173",
    "https://chat-frontend-ten-murex.vercel.app",
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials:true,
};

export { corsOption };

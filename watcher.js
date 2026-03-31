require('dotenv').config();
const fs = require("fs");
const path = require("path");
const { processFile } = require("./ai");

const inboxPath = "./Inbox";
const actionPath = "./Needs_Action";

fs.watch(inboxPath, async (eventType, filename) => {
  if (filename && eventType === "rename") {
    const filePath = path.join(inboxPath, filename);

    if (fs.existsSync(filePath)) {
      console.log("New file detected:", filename);

      try {
        const result = await processFile(filePath);

        if (result) {
          fs.writeFileSync(filePath, result, "utf-8");
          console.log("File processed by 9Router AI (kiro/qwen-coder-next)");
        } else {
          console.warn("Empty result from AI — file left unchanged.");
        }
      } catch (err) {
        console.error("AI processing failed:", err);
      }

      const newPath = path.join(actionPath, filename);
      fs.rename(filePath, newPath, (err) => {
        if (err) console.error("Failed to move file:", err);
        else console.log("Moved to Needs_Action:", filename);
      });
    }
  }
});
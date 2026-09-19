const fs = require("fs");
let content = fs.readFileSync("src/routes/login.tsx", "utf8");

content = content.replace(
  `        {/* Join Group Modal accessible from Welcome, Login, and Signup screens */}
        {showJoinGroupModal && (
  );
}`,
  `      </div>
    </MobileShell>
  );
}`,
);

fs.writeFileSync("src/routes/login.tsx", content);
console.log("Login patched");

// AP Chem Quest API and static file server.
// Run with: node app.js
// Then open: http://localhost:3000

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;

// Render requires public web services to bind to 0.0.0.0 and the PORT env var.
// Locally, 127.0.0.1 keeps the server private to your machine unless HOST is set.
const HOST = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");

// The frontend file sits one folder above this API folder.
const GAME_FILE = path.join(__dirname, "..", "index.html");

// Small in-memory scoreboard. This resets when the server restarts.
const scores = [];

// AP Chemistry question bank. The API hides answerIndex from GET responses.
const QUESTIONS = [
  {
    id: "l1-q1",
    levelId: 1,
    prompt: "Which particle has a negative charge and is found outside the nucleus?",
    choices: ["Proton", "Neutron", "Electron", "Alpha particle"],
    answerIndex: 2,
    explanation: "Electrons are negatively charged and occupy orbitals outside the nucleus.",
  },
  {
    id: "l1-q2",
    levelId: 1,
    prompt: "A neutral atom has 17 protons. How many electrons does it have?",
    choices: ["7", "17", "18", "34"],
    answerIndex: 1,
    explanation: "Neutral atoms have the same number of protons and electrons.",
  },
  {
    id: "l1-q3",
    levelId: 1,
    prompt: "What does the atomic number of an element represent?",
    choices: ["Mass number", "Number of protons", "Number of neutrons", "Average atomic mass"],
    answerIndex: 1,
    explanation: "Atomic number is defined by the number of protons in the nucleus.",
  },
  {
    id: "l2-q1",
    levelId: 2,
    prompt: "How many moles are in 44.0 g of CO2? Molar mass of CO2 is 44.0 g/mol.",
    choices: ["0.500 mol", "1.00 mol", "2.00 mol", "44.0 mol"],
    answerIndex: 1,
    explanation: "Moles = mass divided by molar mass, so 44.0 g / 44.0 g/mol = 1.00 mol.",
  },
  {
    id: "l2-q2",
    levelId: 2,
    prompt: "In 2H2 + O2 -> 2H2O, what mole ratio converts H2 to H2O?",
    choices: ["1 mol H2O / 2 mol H2", "2 mol H2O / 2 mol H2", "2 mol H2 / 1 mol H2O", "1 mol O2 / 2 mol H2O"],
    answerIndex: 1,
    explanation: "The coefficients show 2 mol H2 forms 2 mol H2O, a 1:1 ratio.",
  },
  {
    id: "l2-q3",
    levelId: 2,
    prompt: "What is the limiting reactant?",
    choices: [
      "The reactant with the largest molar mass",
      "The reactant that is completely consumed first",
      "The product formed in the smallest mass",
      "The catalyst in the reaction",
    ],
    answerIndex: 1,
    explanation: "The limiting reactant runs out first and limits the amount of product formed.",
  },
  {
    id: "l3-q1",
    levelId: 3,
    prompt: "A reaction releases heat to its surroundings. What type of reaction is it?",
    choices: ["Endothermic", "Exothermic", "Isothermal", "Electrolytic"],
    answerIndex: 1,
    explanation: "Exothermic reactions release heat, so their enthalpy change is negative.",
  },
  {
    id: "l3-q2",
    levelId: 3,
    prompt: "If q = mcAT, which unit is usually used for specific heat capacity in AP Chemistry?",
    choices: ["J/(g*C)", "mol/L", "atm/L", "g/mol"],
    answerIndex: 0,
    explanation: "Specific heat capacity is commonly measured as joules per gram degree Celsius.",
  },
  {
    id: "l3-q3",
    levelId: 3,
    prompt: "When a system absorbs heat at constant pressure, what is usually positive?",
    choices: ["Delta H", "Ksp", "pH", "Oxidation number"],
    answerIndex: 0,
    explanation: "Heat absorbed at constant pressure corresponds to a positive enthalpy change.",
  },
  {
    id: "l4-q1",
    levelId: 4,
    prompt: "For N2O4(g) <=> 2NO2(g), what happens if pressure is increased?",
    choices: [
      "Shifts toward NO2",
      "Shifts toward N2O4",
      "K changes immediately",
      "The reaction stops",
    ],
    answerIndex: 1,
    explanation: "Higher pressure favors the side with fewer gas moles, which is N2O4.",
  },
  {
    id: "l4-q2",
    levelId: 4,
    prompt: "What does a large equilibrium constant K mean?",
    choices: [
      "Reactants are favored",
      "Products are favored",
      "The reaction is impossible",
      "Temperature is zero",
    ],
    answerIndex: 1,
    explanation: "A large K means the product concentration terms dominate at equilibrium.",
  },
  {
    id: "l4-q3",
    levelId: 4,
    prompt: "Which change always changes the value of K for a reaction?",
    choices: ["Adding a catalyst", "Changing temperature", "Adding inert gas", "Changing container size"],
    answerIndex: 1,
    explanation: "Only temperature changes the equilibrium constant for a given reaction.",
  },
  {
    id: "l5-q1",
    levelId: 5,
    prompt: "What does a catalyst do to a reaction?",
    choices: [
      "Raises activation energy",
      "Lowers activation energy",
      "Changes Delta G",
      "Gets consumed as a reactant",
    ],
    answerIndex: 1,
    explanation: "A catalyst provides an alternate pathway with lower activation energy.",
  },
  {
    id: "l5-q2",
    levelId: 5,
    prompt: "For a first-order reaction, what stays constant as concentration changes?",
    choices: ["Half-life", "Pressure", "Mass", "pH"],
    answerIndex: 0,
    explanation: "First-order reactions have a constant half-life independent of concentration.",
  },
  {
    id: "l5-q3",
    levelId: 5,
    prompt: "What is the rate law for an elementary step A + B -> products?",
    choices: ["rate = k[A][B]", "rate = k[A]^2", "rate = k[B]^2", "rate = k/[A][B]"],
    answerIndex: 0,
    explanation: "For an elementary step, the rate law follows the molecularity of the step.",
  },
];
function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data, null, 2);

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  res.end(body);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
    "Access-Control-Allow-Origin": "*",
  });

  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;

      // Protect the server from very large request bodies.
      if (raw.length > 1_000_000) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Request body must be valid JSON."));
      }
    });

    req.on("error", reject);
  });
}
function publicQuestion(question) {
  return {
    id: question.id,
    levelId: question.levelId,
    prompt: question.prompt,
    choices: question.choices,
  };
}
function getRandomQuestion(levelId) {
  const pool = QUESTIONS.filter((question) => question.levelId === levelId);

  if (pool.length === 0) {
    return null;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}
function serveGame(res) {
  fs.readFile(GAME_FILE, (error, file) => {
    if (error) {
      sendText(res, 500, "Could not load index.html. Make sure it exists one folder above node/app.js.");
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": file.length,
    });

    res.end(file);
  });
}
async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      game: "AP Chem Quest",
      message: "API is running.",
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/questions") {
    const levelId = Number(url.searchParams.get("level"));
    const question = getRandomQuestion(levelId);

    if (!question) {
      sendJson(res, 404, {
        error: "No question exists for that level.",
      });
      return;
    }

    sendJson(res, 200, publicQuestion(question));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/answer") {
    try {
      const body = await readBody(req);
      const question = QUESTIONS.find((item) => item.id === body.questionId);

      if (!question) {
        sendJson(res, 404, {
          correct: false,
          error: "Question not found.",
        });
        return;
      }

      const choiceIndex = Number(body.choiceIndex);
      const correct = choiceIndex === question.answerIndex;

      sendJson(res, 200, {
        correct,
        correctIndex: question.answerIndex,
        explanation: question.explanation,
      });
    } catch (error) {
      sendJson(res, 400, {
        correct: false,
        error: error.message,
      });
    }

    return;
  }

  if (req.method === "GET" && url.pathname === "/api/scores") {
    sendJson(res, 200, {
      scores,
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/scores") {
    try {
      const body = await readBody(req);
      const score = {
        name: String(body.name || "Player").slice(0, 18),
        totalScore: Number(body.totalScore || 0),
        coins: Number(body.coins || 0),
        levelsCleared: Number(body.levelsCleared || 0),
        completed: Boolean(body.completed),
        createdAt: new Date().toISOString(),
      };

      scores.push(score);
      scores.sort((a, b) => b.totalScore - a.totalScore);

      while (scores.length > 10) {
        scores.pop();
      }

      sendJson(res, 201, {
        saved: true,
        score,
        scores,
      });
    } catch (error) {
      sendJson(res, 400, {
        saved: false,
        error: error.message,
      });
    }

    return;
  }
  sendJson(res, 404, {
    error: "API route not found.",
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    await handleApi(req, res, url);
    return;
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    serveGame(res);
    return;
  }

  sendText(res, 404, "Not found.");
});

server.listen(PORT, HOST, () => {
  console.log(`AP Chem Quest is running at http://localhost:${PORT}`);
});
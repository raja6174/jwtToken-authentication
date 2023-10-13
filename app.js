const express = require("express");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const path = require("path");
const dbPath = path.join(__dirname, "goodreads.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
  }
};

initializeDbAndServer();

//Get Books API
app.get("/books/", async (request, response) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }

  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid Access Token");
  } else {
    jwt.verify(jwtToken, "SECRET", async (error, user) => {
      if (error) {
        response.status(401);
        response.send("Invalid Access Token");
      } else {
        const getBooksQuery = `
                SELECT * 
                FROM
                    book
                ORDER BY 
                
                    book_id
            `;

        const booksArray = await db.all(getBooksQuery);
        response.send(booksArray);
      }
    });
  }
});

//User Register API
app.post("/users/", async (request, response) => {
  const { name, username, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const getUserQuery = `
    SELECT *
    FROM
    user 
    WHERE 
        username = '${username}';
    `;

  const dbUser = await db.get(getUserQuery);

  if (dbUser === undefined) {
    const createUserQuery = `
        INSERT INTO 
        user(name, username, password, gender, location)
        VALUES(
            '${name}', 
            '${username}',
            '${hashedPassword}', 
            '${gender}',
            '${location}'
        )
        `;
    await db.run(createUserQuery);
    response.send("User Created Successfully");
  } else {
    response.status(400);
    response.send("User Already Exists");
  }
});

//User Login API

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;

  const getUserQuery = `
  SELECT * FROM user
  WHERE 
        username = '${username}';
  `;

  const dbUser = await db.get(getUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "SECRET");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

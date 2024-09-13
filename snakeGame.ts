import { createReadStream, existsSync } from "fs";
import { join } from "path";
// csv
import { createObjectCsvWriter } from "csv-writer";
import csv from "csv-parser";
import { keyIn, prompt, question } from "readline-sync";
// Type
type TMenu = string[];
type TMenuTitleObj = {
  [key: string]: string;
};

type TMenuOptionsObj = {
  [key: string]: TMenu;
};

type TMenuData = {
  title: string;
  options: TMenu;
  result?: string;
};

type TMenuList = {
  [key: string]: TMenuData;
};

type TBoxObj = {
  x: number;
  y: number;
};

type TSnakeObj = TBoxObj[];
type TFoodObj = TBoxObj;
type TGameConfig = {
  width: number;
  height: number;
  snake: TSnakeObj;
  food: TFoodObj;
  score: number;
  dir: string;
  continue: boolean;
};

type TSnakeDirection = { [id: string]: [number, number] };

type TInterValId = ReturnType<typeof setInterval>;

type TUserScore = {
  name: string;
  score: number;
  date: string;
};

type TUserList = TUserScore[];

// define global constant
const menuTitle: TMenuTitleObj = {
  main: `
      _____             __           ________    ____     
      / ___/____  ____ _/ /_____     / ____/ /   /  _/     
      \\__ \\/ __ \\/ __ \`/ //_/ _ \\   / /   / /    / /  
      ___/ / / / / /_/ / ,< /  __/  / /___/ /____/ /        
      /____/_/ /_/\\__,_/_/|_|\\___/   \\____/_____/___/     
      
      `,
  gameOver: `
      ______                        ____                         
     / ____/___ _____ ___  ___     / __ \\_   _____  _____      
    / / __/ __ \`/ __ \`__ \\/ _ \\   / / / / | / / _ \\/ ___/ 
    / /_/ / /_/ / / / / / /  __/  / /_/ /| |/ /  __/ /         
    \\____/\\__,_/_/ /_/ /_/\\___/   \\____/ |___/\\___/_/     
    `,
};

const menuScreenOptions: TMenuOptionsObj = {
  main: ["play game", "view scoreboard", "exit game"],
  gameOver: ["replay", "save score", "return main menu", "exit game"],
};

const menuList: TMenuList = {
  main: {
    title: menuTitle.main,
    options: menuScreenOptions.main,
  },
  gameOver: {
    title: menuTitle.gameOver,
    options: menuScreenOptions.gameOver,
    result: "",
  },
};

// global game config
const gameConfig: TGameConfig = {
  width: 0,
  height: 0,
  snake: [{ x: 0, y: 0 }],
  food: { x: 0, y: 0 },
  score: 0,
  dir: "r",
  continue: true,
};

const snakeDirection: TSnakeDirection = {
  r: [1, 0],
  l: [-1, 0],
  u: [0, -1],
  d: [0, 1],
};

// helper function

// debug function
function showEvents() {
  console.log(process.stdin.eventNames());
}

// exit whole app
function exitApp() {
  console.log(alignCenterTxt("Thanks for playing!"));
}

// return the controlling to terminal
async function returnTerminalControl(): Promise<void> {
  return new Promise((resolve) => {
    removeStdIn();
    showCursor();
    resolve();
  });
}

// generate random number
function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// get current date time
function getCurrentDateTime(): string {
  let stringDateTime = "";
  const date = new Date();
  stringDateTime = `${date.toLocaleTimeString()} ${date.toLocaleDateString()}`;
  return stringDateTime;
}

// wait function
function wait(ms: number) {
  let start = new Date().getTime();
  let end = start;
  while (end < start + ms) {
    end = new Date().getTime();
  }
}

// modify string function
function capitalizeWords(sentence: string): string {
  let capitalizedSentence = "";
  let capitalizeNext = true;

  for (let i = 0; i < sentence.length; i++) {
    const currentChar = sentence[i];

    if (capitalizeNext && currentChar !== " ") {
      capitalizedSentence += currentChar.toUpperCase();
      capitalizeNext = false;
    } else {
      capitalizedSentence += currentChar.toLowerCase();
    }

    if (currentChar === " ") {
      capitalizeNext = true;
    }
  }

  return capitalizedSentence;
}

// working with arrays
function compareBox(a: TBoxObj, b: TBoxObj): boolean {
  return a.x === b.x && a.y === b.y;
}

function isContained(arr: TBoxObj[], item: TBoxObj): boolean {
  for (let i = 0; i < arr.length; i++) {
    if (compareBox(arr[i], item)) {
      return true;
    }
  }
  return false;
}

function setEmptyArr(arrLength: number): TBoxObj[] {
  let arr: TBoxObj[] = [];
  for (let i = 0; i < arrLength; i++) {
    arr[i] = { x: 0, y: 0 };
  }

  return arr;
}

function addElToHead(arr: TBoxObj[], item: TBoxObj): void {
  arr[arr.length] = { x: 0, y: 0 };
  for (let i = arr.length - 1; i > 0; i--) {
    arr[i].x = arr[i - 1].x;
    arr[i].y = arr[i - 1].y;
  }
  arr[0].x = item.x;
  arr[0].y = item.y;
}

function delElFromTail(arr: TBoxObj[]): TBoxObj[] {
  let newArr: TBoxObj[] = setEmptyArr(arr.length - 1);
  for (let i = 0; i < arr.length - 1; i++) {
    newArr[i].x = arr[i].x;
    newArr[i].y = arr[i].y;
  }

  return newArr;
}

// process terminal function
function hideCursor() {
  process.stdout.write("\x1B[?25l");
}
function showCursor() {
  process.stdout.write("\x1B[?25h");
}

function setStdIn() {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf-8");
}

function removeStdIn() {
  process.stdin.setRawMode(false);
  process.stdin.pause();
  process.stdin.setEncoding("utf-8");
}

// function to calculate menu text padding
function calcMaxTextWidth(menu: TMenuData) {
  let title = menu.title;
  let options = menu.options;
  return Math.max(
    ...(options || []).concat(title).map((str) => calcTextWidth(str))
  );
}

function calcTextWidth(txt: string): number {
  let rows: string[] = txt.split("\n");
  let txtWidth: number = Math.max(...rows.map((s) => s.length));
  return txtWidth;
}

function alignCenterTxt(
  txt: string,
  highLight: boolean = false,
  margin: number = 0
): string {
  let txtWidth: number = calcTextWidth(txt);
  let padding = " ".repeat(Math.floor((process.stdout.columns - txtWidth) / 2));

  return txt
    .split("\n")
    .map((s) => {
      const marginedStartPadding = padding.slice(0, padding.length - margin);
      const str = " ".repeat(margin) + s + " ".repeat(margin);
      if (highLight) {
        const modifyStr = `\x1b[47m\x1b[30m${str}\x1b[0m`;
        return `${marginedStartPadding}${modifyStr}`;
      }
      return `${marginedStartPadding}${str}`;
    })
    .join("\n");
}

// function to handle csv
function checkFileExist(fileName: string): boolean {
  let filePath = join(__dirname, fileName);
  return existsSync(filePath);
}

async function writeCSV(fileName: string, data: TUserScore): Promise<void> {
  let filePath = join(__dirname, fileName);
  let csvWriterConfig = {
    path: filePath,
    header: [
      { id: "name", title: "Name" },
      { id: "score", title: "Score" },
      { id: "date", title: "Date" },
    ],
    append: false,
  };

  if (checkFileExist(fileName)) {
    csvWriterConfig["append"] = true;
  }
  const csvWriter = createObjectCsvWriter(csvWriterConfig);
  await csvWriter.writeRecords([data]);
}

async function readCSVStream(fileName: string): Promise<TUserList> {
  let filePath = join(__dirname, fileName);
  let stream = createReadStream(filePath);

  let csvParser = csv();

  return new Promise((resolve, reject) => {
    const result: TUserList = [];
    stream.pipe(csvParser);

    stream
      .pipe(csv())
      .on("data", (data: TUserScore) => result.push(data))
      .on("end", () => {
        resolve(result);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

async function readCSV(fileName: string): Promise<TUserList> {
  // check if file exists
  if (!checkFileExist(fileName)) {
    return [];
  }
  let userScoreList: TUserList = await readCSVStream(fileName);
  return userScoreList;
}

function createMenu(menu: TMenuData, handleMenuFunc: Function): void {
  let selectedOptionIndex: number = 0;
  // setup the listner for menu controller
  process.stdin.on("data", (key: string) => {
    const str = key.toString();
    if (str.length == 3) {
      selectedOptionIndex = getCurrentOptionIdx(
        str.charCodeAt(2).toString(),
        selectedOptionIndex,
        menu.options
      );
      displayMenu(menu, selectedOptionIndex);
    }

    if (key.toString().toLowerCase() === "q") {
      // when exit, remove this listener from process.stdin immediately.
      process.stdin.removeAllListeners("data");
      removeStdIn();
      showCursor();
      process.exit();
    }

    if (key === "\r" || key === "\n") {
      process.stdin.removeAllListeners("data");
      handleMenuFunc(selectedOptionIndex);
    }
  });

  displayMenu(menu, selectedOptionIndex);
}

function getCurrentOptionIdx(
  key: string,
  selectedOptionIndex: number,
  options: TMenu
): number {
  switch (key) {
    case "65":
      return Math.max(0, selectedOptionIndex - 1);
    case "66":
      return Math.min(options.length - 1, selectedOptionIndex + 1);
    default:
      return selectedOptionIndex;
  }
}

function displayMenu(menu: TMenuData, selectedOptionIndex: number) {
  console.clear();
  let itemTxt = "";
  let title = menu.title;
  let options = menu.options;
  console.log(alignCenterTxt(title));
  for (const key in menu) {
    if (key === "result") {
      let result: string = menu[key] as string;
      itemTxt = alignCenterTxt(result, false);
      console.log(itemTxt);
    }
  }

  options.forEach((option, index) => {
    itemTxt = "";
    let margin = Math.floor((calcMaxTextWidth(menu) - options.length) / 2);
    if (index === selectedOptionIndex) {
      option = capitalizeWords(option);
      itemTxt = alignCenterTxt(option, true, margin);
    } else {
      option = capitalizeWords(option);
      itemTxt = alignCenterTxt(option, false, margin);
    }
    console.log(itemTxt);
  });
}

// START MAIN SCREEN
async function handleMainMenu(selectedOptionIndex: number): Promise<void> {
  if (selectedOptionIndex === 0) {
    setGameScreen();
  }
  if (selectedOptionIndex === 1) {
    await setScoreBoardScreen();
    console.log("Press any to return to main menu...");
    process.stdin.on("data", (key: string) => {
      process.stdin.removeAllListeners("data");
      setMainScreen();
    });
  }
  if (selectedOptionIndex === 2) {
    process.exit();
  }
}

function displayMainMenu() {
  createMenu(menuList.main, handleMainMenu);
}

function setMainScreen() {
  // clear screen
  console.clear();
  // show main menu
  displayMainMenu();
}
// END MAIN SCREEN

// START GAME SCREEN
function setBoardHeight(gameConfig: TGameConfig): void {
  gameConfig.height = process.stdout.rows - 0.2 * process.stdout.rows;
}

function setBoardWidth(gameConfig: TGameConfig): void {
  gameConfig.width = process.stdout.columns - 0.2 * process.stdout.columns;
}

function setSnake(gameConfig: TGameConfig): void {
  let snakeLength = 3;
  gameConfig.snake = setEmptyArr(snakeLength);
  // snake head
  gameConfig.snake[0].x = getRandomInt(snakeLength + 3, gameConfig.width - 5);
  gameConfig.snake[0].y = getRandomInt(snakeLength + 3, gameConfig.height - 5);

  for (let i = 1; i < snakeLength; i++) {
    gameConfig.snake[i].x = gameConfig.snake[i - 1].x - 1;
    gameConfig.snake[i].y = gameConfig.snake[i - 1].y;
  }
}

function setFoodPostion(gameConfig: TGameConfig): void {
  gameConfig.food.x = getRandomInt(5, gameConfig.width - 5);
  gameConfig.food.y = getRandomInt(5, gameConfig.height - 5);
  if (isContained(gameConfig.snake, gameConfig.food)) {
    setFoodPostion(gameConfig);
  }
}
function handleSnakeControl(input: string, gameConfig: TGameConfig): void {
  switch (input) {
    case "65":
      gameConfig.dir = "u";
      break;
    case "68":
      gameConfig.dir = "l";
      break;
    case "66":
      gameConfig.dir = "d";
      break;
    case "67":
      gameConfig.dir = "r";
      break;
    case "q":
      gameConfig.continue = false;
      break;
    default:
      gameConfig.continue = true;
      break;
  }
}

function moveSnake(gameConfig: TGameConfig): void {
  let newSnakeHead = { x: 0, y: 0 };
  newSnakeHead.x = gameConfig.snake[0].x + snakeDirection[gameConfig.dir][0];
  newSnakeHead.y = gameConfig.snake[0].y + snakeDirection[gameConfig.dir][1];

  addElToHead(gameConfig.snake, newSnakeHead);
  let newSnake: TSnakeObj = delElFromTail(gameConfig.snake);
  gameConfig.snake = newSnake;

  //   when moving, check if the snake collides with wall
  if (isOutOfBox(gameConfig)) {
    gameConfig.continue = false;
  }
}

function eatFood(gameConfig: TGameConfig) {
  // increase snake length
  let newSnakeHead: TBoxObj = { x: 0, y: 0 };
  newSnakeHead.x = gameConfig.snake[0].x + snakeDirection[gameConfig.dir][0];
  newSnakeHead.y = gameConfig.snake[0].y + snakeDirection[gameConfig.dir][1];
  addElToHead(gameConfig.snake, newSnakeHead);
  // update score
  gameConfig.score++;
  // set new food position
  setFoodPostion(gameConfig);
}

function isOutOfBox(gameConfig: TGameConfig) {
  return (
    gameConfig.snake[0].x < 0 ||
    gameConfig.snake[0].y < 0 ||
    gameConfig.snake[0].x >= gameConfig.width ||
    gameConfig.snake[0].y >= gameConfig.height
  );
}

function drawMap(gameConfig: TGameConfig): void {
  let gameMap: string = "";
  let wallRow: string = "#";
  if (!gameConfig.continue) {
    wallRow = `\x1b[31m#\x1b[0m`;
  }
  for (let i = 0; i <= gameConfig.width; i++) {
    if (!gameConfig.continue) {
      wallRow += `\x1b[31m#\x1b[0m`;
    } else {
      wallRow += "#";
    }
  }
  wallRow += "\n";
  gameMap += wallRow;

  for (let y = 0; y < gameConfig.height; y++) {
    let row: string = "#";
    if (!gameConfig.continue) {
      row = `\x1b[31m#\x1b[0m`;
    }
    for (let x = 0; x < gameConfig.width; x++) {
      if (isContained(gameConfig.snake, { x, y })) {
        if (!gameConfig.continue) {
          row += `\x1b[31mX\x1b[0m`;
        } else {
          row += "X";
        }
      } else if (gameConfig.food.x === x && gameConfig.food.y === y) {
        row += "@";
      } else {
        row += " ";
      }
    }
    if (!gameConfig.continue) {
      row += `\x1b[31m#\x1b[0m`;
    } else {
      row += "#";
    }
    row += "\n";
    gameMap += row;
  }
  gameMap += wallRow;

  console.log(gameMap);
}

function drawScore(gameConfig: TGameConfig): void {
  console.log(`Score: ${gameConfig.score}`);
}
function drawGame(gameConfig: TGameConfig): void {
  // clear screen before draw
  console.clear();
  //   show score
  drawScore(gameConfig);
  //   show game map
  drawMap(gameConfig);
}

function blink(gameConfig: TGameConfig) {
  for (let i = 0; i < 4; i++) {
    console.clear();
    wait(400);
    drawGame(gameConfig);
    wait(400);
  }
}

function startGame(gameConfig: TGameConfig): void {
  // calculate the new snake after we choose the direction based on control
  moveSnake(gameConfig);

  // check if the snake die
  if (gameConfig.continue) {
    //   check if the snake eats the food
    if (compareBox(gameConfig.snake[0], gameConfig.food)) {
      eatFood(gameConfig);
    }

    //   if snake alive, now, draw the new snake on the screen
    drawGame(gameConfig);
  }
}

function exitGame(gameConfig: TGameConfig): void {
  // remove listeners
  process.stdin.removeAllListeners("data");
  //   clear console
  console.clear();
  setGameOverScreen();
}

function setGameConfig() {
  setBoardWidth(gameConfig);
  setBoardHeight(gameConfig);
  setSnake(gameConfig);
  setFoodPostion(gameConfig);
  gameConfig.continue = true;
  gameConfig.score = 0;
  gameConfig.dir = "r";
  return gameConfig;
}
function setGameScreen() {
  // clear screen
  console.clear();

  //   first setup
  let gameConfig: TGameConfig = setGameConfig();

  //   draw game
  drawGame(gameConfig);

  //   assign snake control listener
  setGameScreenListener(gameConfig);

  //   run the game
  const timeInterval: number = 200;
  let intereValId: TInterValId = setInterval(() => {
    if (!gameConfig.continue) {
      clearInterval(intereValId);
      blink(gameConfig);
      exitGame(gameConfig);
    }
    startGame(gameConfig);
  }, timeInterval);
}
function setGameScreenListener(gameConfig: TGameConfig) {
  process.stdin.on("data", (key: string) => {
    if (key.toString().toLowerCase() === "q") {
      process.stdin.removeAllListeners("data");
      removeStdIn();
      showCursor();
      process.exit();
    } else {
      const str = key.toString();
      if (str.length == 3) {
        handleSnakeControl(str.charCodeAt(2).toString(), gameConfig);
      }
    }
  });

  return gameConfig;
}
// END GAME SCREEN

// STAT GAME OVER SCREEN
async function handleGameOverMenu(selectedOptionIndex: number): Promise<void> {
  switch (selectedOptionIndex) {
    case 0:
      setGameScreen();
      break;
    case 1:
      await saveScore();
      exitApp();
      break;
    case 2:
      setMainScreen();
      break;
    case 3:
      process.exit();
  }
}
function displayGameOverMenu(): void {
  menuList["gameOver"]["result"] = `Your score is ${gameConfig.score}`;
  createMenu(menuList.gameOver, handleGameOverMenu);
}

function setGameOverScreen() {
  // clear screen
  console.clear();

  //   show game over menu
  displayGameOverMenu();
}

function getUserData(): TUserScore {
  let userData: TUserScore = {
    name: "",
    score: gameConfig.score,
    date: "",
  };

  userData.name = question("Enter your name(default: $<defaultInput>): ", {
    defaultInput: `user_${Date.now().toString()}`,
  });
  userData.date = getCurrentDateTime();
  return userData;
}

async function saveScore(): Promise<void> {
  // reset control to normal terminal
  await returnTerminalControl();
  // get userName
  console.clear();
  let userData = getUserData();
  await writeCSV("score.csv", userData);
  console.log("Score saved ok");
}

// END GAME OVER SCREEN
// START GAME SCOREBOARD SCREEN

async function setScoreBoardScreen(): Promise<void> {
  // clear screen
  console.clear();
  //   show score board
  await showScoreBoard();
}

async function showScoreBoard(): Promise<void> {
  let data: TUserList = await readCSV("score.csv");
  if (data.length === 0) {
    console.log("No score yet");
    return;
  }

  console.log("SCORE BOARD");
  console.table(data);
}
// END GAME SCOREBOARD SCREEN

function showScreen(name: string): void {
  switch (name) {
    case "main":
      setMainScreen();
      break;
    case "game":
      setGameScreen();
      break;
    case "gameOver":
      setGameOverScreen();
      break;
    case "scoreBoard":
      setScoreBoardScreen();
      break;
    default:
      throw new Error(`There is no screen ${name}`);
  }
}

// main function: to setup global object, global setup like stdin, stdout.
function main() {
  setStdIn();
  hideCursor();

  //   main screen
  setMainScreen();
}

main();

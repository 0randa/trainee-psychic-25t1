"use client";

import { useState, useEffect, useRef } from "react";
import { uploadGameScore } from "../helpers";

import headImg from "../../../public/images/snake/snake-head.png";
import bodyImg from "../../../public/images/snake/snake-body.png";
import tailImg from "../../../public/images/snake/snake-tail.png";
import turnImg from "../../../public/images/snake/snake-turn.png";

// Constants
const BOARDBACKGROUND = "white";
const SNAKECOLOR = "lightgreen";
const SNAKEBORDER = "black";
const UNITSIZE = 25;
const GAME_SPEED = 100;
const GAME_ID = 2;

export default function SnakeGame() {
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [food, setFood] = useState([0, 0]);
  const [velocity, setVelocity] = useState([UNITSIZE, 0]);
  const [snake, setSnake] = useState([
    { x: UNITSIZE * 4, y: 0 },
    { x: UNITSIZE * 3, y: 0 },
    { x: UNITSIZE * 2, y: 0 },
    { x: UNITSIZE, y: 0 },
    { x: 0, y: 0 },
  ]);

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const runningRef = useRef(running);
  const velocityRef = useRef(velocity);
  const foodRef = useRef(food);

  const imageRefs = useRef({
    head: new Image(),
    tail: new Image(),
    body: new Image(),
    turn: new Image(),
  });

  useEffect(() => {
    imageRefs.current.head.src = headImg.src;
    imageRefs.current.tail.src = tailImg.src;
    imageRefs.current.body.src = bodyImg.src;
    imageRefs.current.turn.src = turnImg.src;
  }, []);

  useEffect(() => {
    foodRef.current = food;
  }, [food]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    velocityRef.current = velocity;
  }, [velocity]);

  const gameWidth = 500;
  const gameHeight = 500;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;
    if (canvasRef.current) canvasRef.current.focus();
    gameStart();
  }, []);

  useEffect(() => {
    if (running) {
      nextTick();
    }
  }, [running]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    clearBoard();
    drawGridBackground();
    drawFood();
    drawSnake();
    if (!runningRef.current && (score > 0 || snake.length > 0)) {
      displayGameOver();
      uploadGameScore(score, GAME_ID);
    }
  }, [snake, food, running, score]);

  function gameStart() {
    setRunning(false);
    setScore(0);
    setVelocity([UNITSIZE, 0]);
    setSnake([
      { x: UNITSIZE * 4, y: 0 },
      { x: UNITSIZE * 3, y: 0 },
      { x: UNITSIZE * 2, y: 0 },
      { x: UNITSIZE, y: 0 },
      { x: 0, y: 0 },
    ]);
    createFood();
    setRunning(true);
    if (canvasRef.current) canvasRef.current.focus();
  }

  function nextTick() {
    if (runningRef.current) {
      setTimeout(() => {
        moveSnake();
        if (runningRef.current) {
          nextTick();
        }
      }, GAME_SPEED);
    }
  }

  function clearBoard() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.fillStyle = BOARDBACKGROUND;
    ctx.fillRect(0, 0, gameWidth, gameHeight);
  }

  function createFood() {
    function randomFoodCoordinate(maxDimension) {
      const numSlots = maxDimension / UNITSIZE;
      return Math.floor(Math.random() * numSlots) * UNITSIZE;
    }
    const foodX = randomFoodCoordinate(gameWidth);
    const foodY = randomFoodCoordinate(gameHeight);
    setFood([foodX, foodY]);
  }

  function moveSnake() {
    if (!runningRef.current) return;

    setSnake((prevSnake) => {
      if (prevSnake.length === 0) {
        if (runningRef.current) setRunning(false);
        return [];
      }

      const currentActualVelocity = velocityRef.current;
      const currentActualFood = foodRef.current;

      const currentHead = prevSnake[0];
      const newHead = {
        x: currentHead.x + currentActualVelocity[0],
        y: currentHead.y + currentActualVelocity[1],
      };

      if (
        newHead.x < 0 ||
        newHead.x >= gameWidth ||
        newHead.y < 0 ||
        newHead.y >= gameHeight
      ) {
        setRunning(false);
        return prevSnake;
      }

      const ateFoodProvisionalForSelfCollision =
        newHead.x === currentActualFood[0] &&
        newHead.y === currentActualFood[1];
      for (let i = 0; i < prevSnake.length; i++) {
        if (!ateFoodProvisionalForSelfCollision && i === prevSnake.length - 1) {
          continue;
        }
        if (newHead.x === prevSnake[i].x && newHead.y === prevSnake[i].y) {
          setRunning(false);
          return prevSnake;
        }
      }

      let newSnakeArray = [newHead, ...prevSnake];
      const ateFood =
        newHead.x === currentActualFood[0] &&
        newHead.y === currentActualFood[1];

      if (ateFood) {
        // this is kinda sketchy but oh well
        setScore((s) => s + 1 / 2);
        createFood();
      } else {
        newSnakeArray = newSnakeArray.slice(0, -1);
      }
      return newSnakeArray;
    });
  }

  function changeDirection(event) {
    const keyPressed = event.key;

    const KEY_UP = "w";
    const ARROW_UP = "ArrowUp";
    const KEY_LEFT = "a";
    const ARROW_LEFT = "ArrowLeft";
    const KEY_DOWN = "s";
    const ARROW_DOWN = "ArrowDown";
    const KEY_RIGHT = "d";
    const ARROW_RIGHT = "ArrowRight";

    const currentVel = velocityRef.current;
    const goingUp = currentVel[1] === -UNITSIZE;
    const goingDown = currentVel[1] === UNITSIZE;
    const goingRight = currentVel[0] === UNITSIZE;
    const goingLeft = currentVel[0] === -UNITSIZE;

    let newVelocity = currentVel;

    switch (true) {
      case (keyPressed === KEY_LEFT || keyPressed === ARROW_LEFT) &&
        !goingRight:
        newVelocity = [-UNITSIZE, 0];
        break;
      case (keyPressed === KEY_UP || keyPressed === ARROW_UP) && !goingDown:
        newVelocity = [0, -UNITSIZE];
        break;
      case (keyPressed === KEY_RIGHT || keyPressed === ARROW_RIGHT) &&
        !goingLeft:
        newVelocity = [UNITSIZE, 0];
        break;
      case (keyPressed === KEY_DOWN || keyPressed === ARROW_DOWN) && !goingUp:
        newVelocity = [0, UNITSIZE];
        break;
      default:
        return;
    }
    setVelocity(newVelocity);
  }

  return (
    <div className="text-center">
      <canvas
        ref={canvasRef}
        width={gameWidth}
        height={gameHeight}
        className="border-solid border-black border-[3px] mx-auto block"
        tabIndex={0}
        onKeyDown={changeDirection}
      />
      <br />
      <div className="text-[85px] font-[Roboto, sans-serif] font-medium">
        {score}
      </div>
      <button id="resetBtn" onClick={gameStart} className="btn btn-neutral">
        Play Again
      </button>
    </div>
  );

  ////////////////////////////////
  /// Drawing Functions
  ////////////////////////////////

  function drawFood() {
    const ctx = ctxRef.current;
    if (!ctx || !food) return;
    const [foodX, foodY] = food;

    const centerX = foodX + UNITSIZE / 2;
    const centerY = foodY + UNITSIZE / 2;
    const radius = UNITSIZE / 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#e8481d";
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(centerX - 4, centerY - 4, radius / 3, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.globalAlpha = 0.3;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.closePath();

    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY - radius - 5);
    ctx.strokeStyle = "brown";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
  }

  function drawSnake() {
    const ctx = ctxRef.current;
    if (!ctx) return;

    snake.forEach((part, index) => {
      const isHead = index === 0;
      const isTail = index === snake.length - 1;
      const x = part.x;
      const y = part.y;

      let img;
      let angle = 0;

      if (isHead) {
        img = imageRefs.current.head;
        if (snake.length > 1) {
          angle = getRotationAngle(part, snake[1]);
        }
      } else if (isTail) {
        img = img = imageRefs.current.tail;
        if (snake.length > 1) {
          angle = getRotationAngle(snake[snake.length - 2], part);
        }
      } else {
        const prev = snake[index - 1];
        const next = snake[index + 1];
        const isTurn = prev.x !== next.x && prev.y !== next.y;

        if (isTurn) {
          img = imageRefs.current.turn;
          angle = getTurnAngle(prev, part, next);
        } else {
          img = imageRefs.current.body;
          angle = getRotationAngle(prev, part);
        }
      }

      const hasImage = img.complete && img.naturalWidth > 0;

      if (hasImage) {
        ctx.save();
        ctx.translate(x + UNITSIZE / 2, y + UNITSIZE / 2);
        ctx.rotate(angle);
        ctx.drawImage(img, -UNITSIZE / 2, -UNITSIZE / 2, UNITSIZE, UNITSIZE);
        ctx.restore();
      } else {
        ctx.fillStyle = isHead ? "darkgreen" : SNAKECOLOR;
        ctx.fillRect(x, y, UNITSIZE, UNITSIZE);
        ctx.strokeStyle = SNAKEBORDER;
        ctx.strokeRect(x, y, UNITSIZE, UNITSIZE);
      }
    });
  }

  function getTurnAngle(prev, current, next) {
    const dx1 = current.x - prev.x;
    const dy1 = current.y - prev.y;
    const dx2 = next.x - current.x;
    const dy2 = next.y - current.y;

    const from = { x: Math.sign(dx1), y: Math.sign(dy1) };
    const to = { x: Math.sign(dx2), y: Math.sign(dy2) };

    if (from.x === 1 && to.y === 1) return Math.PI;
    if (from.y === 1 && to.x === -1) return (3 * Math.PI) / 2;
    if (from.x === -1 && to.y === -1) return 0;
    if (from.y === -1 && to.x === 1) return Math.PI / 2;

    if (from.y === 1 && to.x === 1) return 0;
    if (from.x === -1 && to.y === 1) return Math.PI / 2;
    if (from.y === -1 && to.x === -1) return Math.PI;
    if (from.x === 1 && to.y === -1) return (3 * Math.PI) / 2;

    console.warn("UNHANDLED TURN", { from, to });
    return 0;
  }

  function getRotationAngle(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx === UNITSIZE) return 0;
    if (dy === UNITSIZE) return Math.PI / 2;
    if (dx === -UNITSIZE) return Math.PI;
    if (dy === -UNITSIZE) return -Math.PI / 2;
    return 0;
  }

  function drawGridBackground() {
    const ctx = ctxRef.current;
    for (let x = 0; x < gameWidth; x += UNITSIZE) {
      for (let y = 0; y < gameHeight; y += UNITSIZE) {
        const t1 = (y / UNITSIZE) % 2;
        const t2 = (x / UNITSIZE) % 2;
        if (t1 === t2) {
          ctx.fillStyle = "#d1e5e7";
          ctx.fillRect(x, y, UNITSIZE, UNITSIZE);
        } else {
          ctx.fillStyle = "#deeded";
          ctx.fillRect(x, y, UNITSIZE, UNITSIZE);
        }
      }
    }
  }

  function displayGameOver() {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, gameWidth, gameHeight);

    const boxWidth = 300;
    const boxHeight = 120;
    const x = (gameWidth - boxWidth) / 2;
    const y = (gameHeight - boxHeight) / 2;
    const radius = 20;

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + boxWidth - radius, y);
    ctx.quadraticCurveTo(x + boxWidth, y, x + boxWidth, y + radius);
    ctx.lineTo(x + boxWidth, y + boxHeight - radius);
    ctx.quadraticCurveTo(
      x + boxWidth,
      y + boxHeight,
      x + boxWidth - radius,
      y + boxHeight
    );
    ctx.lineTo(x + radius, y + boxHeight);
    ctx.quadraticCurveTo(x, y + boxHeight, x, y + boxHeight - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#222";
    ctx.font = "bold 36px 'Roboto', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", gameWidth / 2, gameHeight / 2 + 10);
  }
}

import {
  type Board,
  type Move,
  type MoveGenerationOptions,
  type Piece,
  type Player,
  applyMove,
  getLegalMoves,
  getWinner,
} from "./russianDraughtsEngine";

export type AiDifficulty = "easy" | "medium" | "hard";

const HARD_DEPTH = 6;
const WIN_SCORE = 1_000_000;
const MAN_VALUE = 100;
const KING_VALUE = 300;
const MAN_ADVANCEMENT_BONUS = 8;
const KING_CENTER_BONUS = 14;
const MOBILITY_BONUS = 4;
const BACK_ROW_BONUS = 18;

export function getBestMove(
  board: Board,
  difficulty: AiDifficulty,
  options: MoveGenerationOptions = {},
): Move {
  const legalMoves = getLegalMoves(board, options);
  if (legalMoves.length === 0) {
    throw new Error("AI cannot move because there are no legal moves.");
  }

  if (difficulty === "easy") return randomMove(legalMoves);
  if (difficulty === "medium") return getMediumMove(legalMoves);

  return getHardMove(board, legalMoves, options);
}

function getMediumMove(legalMoves: Move[]): Move {
  const captures = legalMoves.filter((move) => move.isCapture);
  if (captures.length === 0) return randomMove(legalMoves);

  const longestCapture = Math.max(...captures.map((move) => move.captures.length));
  return randomMove(captures.filter((move) => move.captures.length === longestCapture));
}

function getHardMove(board: Board, legalMoves: Move[], options: MoveGenerationOptions): Move {
  const rootPlayer = board.turn;
  let bestScore = Number.NEGATIVE_INFINITY;
  const bestMoves: Move[] = [];

  for (const move of legalMoves) {
    const nextBoard = applyMove(board, move);
    const score = minimax(
      nextBoard,
      HARD_DEPTH - 1,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      rootPlayer,
      options,
    );

    if (score > bestScore) {
      bestScore = score;
      bestMoves.length = 0;
      bestMoves.push(move);
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return randomMove(bestMoves);
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  rootPlayer: Player,
  options: MoveGenerationOptions,
): number {
  const winner = getWinner(board);
  if (winner) {
    return winner === rootPlayer ? WIN_SCORE + depth : -WIN_SCORE - depth;
  }

  if (depth === 0) return evaluateBoard(board, rootPlayer, options);

  const legalMoves = getLegalMoves(board, options);
  if (legalMoves.length === 0) return evaluateBoard(board, rootPlayer, options);

  const maximizing = board.turn === rootPlayer;

  if (maximizing) {
    let score = Number.NEGATIVE_INFINITY;
    for (const move of orderedMoves(legalMoves)) {
      score = Math.max(
        score,
        minimax(applyMove(board, move), depth - 1, alpha, beta, rootPlayer, options),
      );
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return score;
  }

  let score = Number.POSITIVE_INFINITY;
  for (const move of orderedMoves(legalMoves)) {
    score = Math.min(
      score,
      minimax(applyMove(board, move), depth - 1, alpha, beta, rootPlayer, options),
    );
    beta = Math.min(beta, score);
    if (beta <= alpha) break;
  }
  return score;
}

function evaluateBoard(board: Board, rootPlayer: Player, options: MoveGenerationOptions): number {
  const ownScore = evaluateForPlayer(board, rootPlayer, options);
  const opponentScore = evaluateForPlayer(board, opponent(rootPlayer), options);
  return ownScore - opponentScore;
}

function evaluateForPlayer(board: Board, player: Player, options: MoveGenerationOptions): number {
  let score = 0;

  for (let index = 0; index < board.cells.length; index += 1) {
    const piece = board.cells[index];
    if (!piece || pieceColor(piece) !== player) continue;

    const [, y] = coordinatesForIndex(index);
    if (isKing(piece)) {
      score += KING_VALUE + kingCenterBonus(index);
    } else {
      score += MAN_VALUE + manAdvancementBonus(player, y);
    }

    if (isBackRowControlSquare(player, y)) {
      score += BACK_ROW_BONUS;
    }
  }

  return score + getLegalMoves({ ...board, turn: player }, options).length * MOBILITY_BONUS;
}

function orderedMoves(moves: Move[]): Move[] {
  return moves
    .slice()
    .sort((a, b) => Number(b.isCapture) - Number(a.isCapture) || b.captures.length - a.captures.length);
}

function randomMove(moves: Move[]): Move {
  return moves[Math.floor(Math.random() * moves.length)];
}

function pieceColor(piece: Piece): Player {
  return piece.startsWith("white") ? "white" : "black";
}

function isKing(piece: Piece): boolean {
  return piece.endsWith("King");
}

function opponent(player: Player): Player {
  return player === "white" ? "black" : "white";
}

function manAdvancementBonus(player: Player, y: number): number {
  const advancement = player === "white" ? 7 - y : y;
  return advancement * MAN_ADVANCEMENT_BONUS;
}

function kingCenterBonus(index: number): number {
  const [x, y] = coordinatesForIndex(index);
  const distanceFromCenter = Math.abs(x - 3.5) + Math.abs(y - 3.5);
  return Math.round((7 - distanceFromCenter) * KING_CENTER_BONUS);
}

function isBackRowControlSquare(player: Player, y: number): boolean {
  return player === "white" ? y === 7 : y === 0;
}

function coordinatesForIndex(index: number): [x: number, y: number] {
  const y = Math.floor(index / 4);
  const x = 2 * (index % 4) + (y % 2 === 0 ? 1 : 0);
  return [x, y];
}

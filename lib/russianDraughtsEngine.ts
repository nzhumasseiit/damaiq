export type Player = "white" | "black";

export type Piece = "whiteMan" | "blackMan" | "whiteKing" | "blackKing";

export type Cell = Piece | null;

export type Square = `${"a" | "b" | "c" | "d" | "e" | "f" | "g" | "h"}${
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"}`;

export type Position = number | Square;

export type Board = {
  turn: Player;
  cells: Cell[];
};

export type Move = {
  from: number;
  to: number;
  path: number[];
  captures: number[];
  isCapture: boolean;
  piece: Piece;
  notation: string;
};

type Direction = readonly [dx: number, dy: number];

const DIRECTIONS = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
] as const satisfies readonly Direction[];

const WHITE_START = new Set([20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]);
const BLACK_START = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

export function createInitialBoard(): Board {
  return {
    turn: "white",
    cells: Array.from({ length: 32 }, (_, index) => {
      if (WHITE_START.has(index)) return "whiteMan";
      if (BLACK_START.has(index)) return "blackMan";
      return null;
    }),
  };
}

export function getLegalMoves(board: Board): Move[] {
  assertBoard(board);

  const captures = getAllCaptures(board);
  if (captures.length > 0) return captures;

  const moves: Move[] = [];
  for (let index = 0; index < 32; index += 1) {
    const piece = board.cells[index];
    if (piece && colorOf(piece) === board.turn) {
      moves.push(...getQuietMovesForPiece(board, index, piece));
    }
  }
  return moves;
}

export function getMovesForPiece(board: Board, position: Position): Move[] {
  assertBoard(board);

  const from = normalizePosition(position);
  const piece = board.cells[from];
  if (!piece || colorOf(piece) !== board.turn) return [];

  const pieceCaptures = getCaptureMovesForPiece(board, from, piece);
  if (getAllCaptures(board).length > 0) return pieceCaptures;

  return [...pieceCaptures, ...getQuietMovesForPiece(board, from, piece)];
}

export function applyMove(board: Board, move: Move | string): Board {
  assertBoard(board);

  const resolvedMove =
    typeof move === "string"
      ? getLegalMoves(board).find((candidate) => candidate.notation === move)
      : move;

  if (!resolvedMove) {
    throw new Error(`Illegal move: ${move}`);
  }

  const cells = board.cells.slice();
  const piece = cells[resolvedMove.from];
  if (!piece) {
    throw new Error(`No piece on ${positionToNotation(resolvedMove.from)}.`);
  }

  cells[resolvedMove.from] = null;
  for (const captured of resolvedMove.captures) {
    cells[captured] = null;
  }

  const destination = resolvedMove.to;
  cells[destination] = pieceAfterPath(piece, resolvedMove.path);

  return {
    turn: opponent(board.turn),
    cells,
  };
}

export function getWinner(board: Board): Player | null {
  assertBoard(board);

  const hasWhite = board.cells.some((piece) => piece && colorOf(piece) === "white");
  const hasBlack = board.cells.some((piece) => piece && colorOf(piece) === "black");

  if (!hasWhite) return "black";
  if (!hasBlack) return "white";
  if (getLegalMoves(board).length === 0) return opponent(board.turn);
  return null;
}

export function boardToNotation(board: Board): string {
  assertBoard(board);

  const white = collectPiecesForNotation(board, "white");
  const black = collectPiecesForNotation(board, "black");
  return `${board.turn === "white" ? "W" : "B"}:W${white.join(",")}:B${black.join(",")}`;
}

export function positionToNotation(position: number): Square {
  assertPlayableIndex(position);

  const [x, y] = coordinatesForIndex(position);
  return `${String.fromCharCode(97 + x)}${8 - y}` as Square;
}

export function notationToPosition(position: Square): number {
  const file = position.charCodeAt(0) - 97;
  const rank = Number(position[1]);
  const y = 8 - rank;

  if (!isOnBoard(file, y) || !isPlayable(file, y)) {
    throw new Error(`Invalid playable square: ${position}`);
  }

  return indexForCoordinates(file, y);
}

function getAllCaptures(board: Board): Move[] {
  const captures: Move[] = [];
  for (let index = 0; index < 32; index += 1) {
    const piece = board.cells[index];
    if (piece && colorOf(piece) === board.turn) {
      captures.push(...getCaptureMovesForPiece(board, index, piece));
    }
  }
  return captures;
}

function getCaptureMovesForPiece(board: Board, from: number, piece: Piece): Move[] {
  const capturedBlockers = new Set<number>();
  return isKing(piece)
    ? collectKingCaptures(board, from, piece, [from], [], capturedBlockers)
    : collectManCaptures(board, from, piece, [from], [], capturedBlockers);
}

function collectManCaptures(
  board: Board,
  from: number,
  piece: Piece,
  path: number[],
  captures: number[],
  capturedBlockers: Set<number>,
): Move[] {
  const moves: Move[] = [];
  const [x, y] = coordinatesForIndex(from);

  for (const [dx, dy] of DIRECTIONS) {
    const enemyCoordinates = [x + dx, y + dy] as const;
    const landingCoordinates = [x + dx * 2, y + dy * 2] as const;
    if (!isOnBoard(...enemyCoordinates) || !isOnBoard(...landingCoordinates)) continue;

    const enemy = indexForCoordinates(...enemyCoordinates);
    const landing = indexForCoordinates(...landingCoordinates);
    if (
      isEnemyPiece(board, enemy, piece, capturedBlockers) &&
      isEmptySquare(board, landing, capturedBlockers)
    ) {
      const nextPiece = maybePromote(piece, landing);
      const nextBoard = movePieceOnBoard(board, from, landing, nextPiece, enemy);
      const nextPath = [...path, landing];
      const nextCaptures = [...captures, enemy];
      const nextBlockers = addBlocker(capturedBlockers, enemy);
      const continuations = isKing(nextPiece)
        ? collectKingCaptures(nextBoard, landing, nextPiece, nextPath, nextCaptures, nextBlockers)
        : collectManCaptures(nextBoard, landing, nextPiece, nextPath, nextCaptures, nextBlockers);

      if (continuations.length > 0) {
        moves.push(...continuations);
      } else {
        moves.push(createMove(nextPath, nextCaptures, nextPiece, true));
      }
    }
  }

  return moves;
}

function collectKingCaptures(
  board: Board,
  from: number,
  piece: Piece,
  path: number[],
  captures: number[],
  capturedBlockers: Set<number>,
): Move[] {
  const moves: Move[] = [];
  const [x, y] = coordinatesForIndex(from);

  for (const [dx, dy] of DIRECTIONS) {
    let scanX = x + dx;
    let scanY = y + dy;

    while (isOnBoard(scanX, scanY)) {
      const scanned = indexForCoordinates(scanX, scanY);
      if (capturedBlockers.has(scanned)) break;

      const scannedPiece = board.cells[scanned];
      if (!scannedPiece) {
        scanX += dx;
        scanY += dy;
        continue;
      }

      if (colorOf(scannedPiece) === colorOf(piece)) break;

      let landingX = scanX + dx;
      let landingY = scanY + dy;
      while (isOnBoard(landingX, landingY)) {
        const landing = indexForCoordinates(landingX, landingY);
        if (!isEmptySquare(board, landing, capturedBlockers)) break;

        const nextBoard = movePieceOnBoard(board, from, landing, piece, scanned);
        const nextPath = [...path, landing];
        const nextCaptures = [...captures, scanned];
        const nextBlockers = addBlocker(capturedBlockers, scanned);
        const continuations = collectKingCaptures(
          nextBoard,
          landing,
          piece,
          nextPath,
          nextCaptures,
          nextBlockers,
        );

        if (continuations.length > 0) {
          moves.push(...continuations);
        } else {
          moves.push(createMove(nextPath, nextCaptures, piece, true));
        }

        landingX += dx;
        landingY += dy;
      }

      break;
    }
  }

  return moves;
}

function getQuietMovesForPiece(board: Board, from: number, piece: Piece): Move[] {
  return isKing(piece)
    ? getQuietKingMoves(board, from, piece)
    : getQuietManMoves(board, from, piece);
}

function getQuietManMoves(board: Board, from: number, piece: Piece): Move[] {
  const moves: Move[] = [];
  const [x, y] = coordinatesForIndex(from);
  const dy = colorOf(piece) === "white" ? -1 : 1;

  for (const dx of [-1, 1]) {
    const targetX = x + dx;
    const targetY = y + dy;
    if (!isOnBoard(targetX, targetY)) continue;

    const to = indexForCoordinates(targetX, targetY);
    if (!board.cells[to]) {
      moves.push(createMove([from, to], [], maybePromote(piece, to), false));
    }
  }

  return moves;
}

function getQuietKingMoves(board: Board, from: number, piece: Piece): Move[] {
  const moves: Move[] = [];
  const [x, y] = coordinatesForIndex(from);

  for (const [dx, dy] of DIRECTIONS) {
    let targetX = x + dx;
    let targetY = y + dy;

    while (isOnBoard(targetX, targetY)) {
      const to = indexForCoordinates(targetX, targetY);
      if (board.cells[to]) break;

      moves.push(createMove([from, to], [], piece, false));
      targetX += dx;
      targetY += dy;
    }
  }

  return moves;
}

function createMove(path: number[], captures: number[], piece: Piece, isCapture: boolean): Move {
  const separator = isCapture ? ":" : "-";
  return {
    from: path[0],
    to: path[path.length - 1],
    path,
    captures,
    isCapture,
    piece,
    notation: path.map(positionToNotation).join(separator),
  };
}

function movePieceOnBoard(
  board: Board,
  from: number,
  to: number,
  piece: Piece,
  captured: number,
): Board {
  const cells = board.cells.slice();
  cells[from] = null;
  cells[captured] = null;
  cells[to] = piece;
  return { ...board, cells };
}

function maybePromote(piece: Piece, to: number): Piece {
  const [, y] = coordinatesForIndex(to);
  if (piece === "whiteMan" && y === 0) return "whiteKing";
  if (piece === "blackMan" && y === 7) return "blackKing";
  return piece;
}

function pieceAfterPath(piece: Piece, path: number[]): Piece {
  let result = piece;
  for (const landing of path.slice(1)) {
    result = maybePromote(result, landing);
  }
  return result;
}

function collectPiecesForNotation(board: Board, player: Player): string[] {
  const pieces: string[] = [];
  for (let index = 0; index < 32; index += 1) {
    const piece = board.cells[index];
    if (!piece || colorOf(piece) !== player) continue;
    pieces.push(`${isKing(piece) ? "K" : ""}${positionToNotation(index)}`);
  }
  return pieces;
}

function isEnemyPiece(
  board: Board,
  position: number,
  piece: Piece,
  capturedBlockers: Set<number>,
): boolean {
  if (capturedBlockers.has(position)) return false;
  const target = board.cells[position];
  return Boolean(target && colorOf(target) !== colorOf(piece));
}

function isEmptySquare(board: Board, position: number, capturedBlockers: Set<number>): boolean {
  return !capturedBlockers.has(position) && !board.cells[position];
}

function addBlocker(blockers: Set<number>, position: number): Set<number> {
  const next = new Set(blockers);
  next.add(position);
  return next;
}

function normalizePosition(position: Position): number {
  if (typeof position === "number") {
    assertPlayableIndex(position);
    return position;
  }

  return notationToPosition(position);
}

function colorOf(piece: Piece): Player {
  return piece.startsWith("white") ? "white" : "black";
}

function isKing(piece: Piece): boolean {
  return piece.endsWith("King");
}

function opponent(player: Player): Player {
  return player === "white" ? "black" : "white";
}

function coordinatesForIndex(index: number): [x: number, y: number] {
  assertPlayableIndex(index);

  const y = Math.floor(index / 4);
  const x = 2 * (index % 4) + (y % 2 === 0 ? 1 : 0);
  return [x, y];
}

function indexForCoordinates(x: number, y: number): number {
  return Math.floor((x + y * 8) / 2);
}

function isOnBoard(x: number, y: number): boolean {
  return x >= 0 && x < 8 && y >= 0 && y < 8;
}

function isPlayable(x: number, y: number): boolean {
  return (x + y) % 2 === 1;
}

function assertPlayableIndex(index: number): void {
  if (!Number.isInteger(index) || index < 0 || index > 31) {
    throw new Error(`Invalid playable square index: ${index}`);
  }
}

function assertBoard(board: Board): void {
  if (board.cells.length !== 32) {
    throw new Error(`Russian draughts boards must contain 32 playable squares.`);
  }
}

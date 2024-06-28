export interface Board {
    game: Game
    state: State
}

export interface Game {
    addMoveToEndOfLine: (...args: any) => unknown;
    agreeDraw: (...args: any) => unknown;
    blinkSquare: (...args: any) => unknown;
    canMoveForward: (...args: any) => unknown;
    claimDraw: (...args: any) => unknown;
    clearMarkings: (...args: any) => unknown;
    createContinuation: (...args: any) => unknown;
    createGame: (...args: any) => unknown;
    getPlayingAs: (...args: any) => unknown;
    setPlayingAs: (...args: any) => unknown;
    usePlayingAs: (...args: any) => unknown;
    deletePosition: (...args: any) => unknown;
    emit: (...args: any) => unknown;
    listeners: Listener[]
    off: (...args: any) => unknown;
    offAll: (...args: any) => unknown;
    offMany: (...args: any) => unknown;
    on: (...args: any) => unknown;
    onAll: (...args: any) => unknown;
    onMany: (...args: any) => unknown;
    once: (...args: any) => unknown;
    extendAPI: (...args: any) => unknown;
    overrideAPI: (...args: any) => unknown;
    getCalculatedResult: (...args: any) => unknown;
    getContext: (...args: any) => unknown;
    getCurrentFullLine: (...args: any) => unknown;
    getFEN: (...args: any) => unknown;
    getFingerprints: (...args: any) => unknown;
    getHeaders: (...args: any) => unknown;
    getHistoryFENs: (...args: any) => unknown;
    getHistorySANs: (...args: any) => unknown;
    getJCEGameCopy: (...args: any) => unknown;
    getLastMove: (...args: any) => unknown;
    getLegalMoves: (...args: any) => unknown;
    getLegalMovesForSquare: (...args: any) => unknown;
    getLine: (...args: any) => unknown;
    getMarkings: (...args: any) => unknown;
    getMaterial: (...args: any) => unknown;
    getMove: (...args: any) => unknown;
    getNodeByIds: (...args: any) => unknown;
    getNodeDiffData: (...args: any) => unknown;
    getNodeIds: (...args: any) => unknown;
    getPGN: (...args: any) => unknown;
    getPiece: (...args: any) => unknown;
    getPieces: (...args: any) => unknown;
    getPosition: (...args: any) => unknown;
    getPositionDetails: (...args: any) => unknown;
    getPositionInfo: (...args: any) => unknown;
    getFinalPositionInfo: (...args: any) => unknown;
    getRawLines: (...args: any) => unknown;
    getRelativeNode: (...args: any) => unknown;
    getResult: (...args: any) => unknown;
    getSelectedNode: (...args: any) => unknown;
    getStartingMoveNumber: (...args: any) => unknown;
    getTCN: (...args: any) => unknown;
    getTurn: (...args: any) => unknown;
    getVariant: (...args: any) => unknown;
    isAtEndOfLine: (...args: any) => unknown;
    isCheck: (...args: any) => unknown;
    isGameOver: (...args: any) => unknown;
    isLegalMove: (...args: any) => unknown;
    load: (...args: any) => unknown;
    logger: Logger
    mark: (...args: any) => unknown;
    move: (...args: any) => unknown;
    moveBackward: (...args: any) => unknown;
    moveForward: (...args: any) => unknown;
    moveVariation: (...args: any) => unknown;
    outOfTime: (...args: any) => unknown;
    promoteVariation: (...args: any) => unknown;
    reload: (...args: any) => unknown;
    resetGame: (...args: any) => unknown;
    resetToMainLine: (...args: any) => unknown;
    resign: (...args: any) => unknown;
    selectLineEnd: (...args: any) => unknown;
    selectLineStart: (...args: any) => unknown;
    selectNode: (...args: any) => unknown;
    setGameDetails: (...args: any) => unknown;
    setResult: (...args: any) => unknown;
    setTurn: (...args: any) => unknown;
    timeControl: TimeControl
    times: Times
    timestamps: Timestamps
    toggleMarking: (...args: any) => unknown;
    undo: (...args: any) => unknown;
    unmark: (...args: any) => unknown;
    updateLineComment: (...args: any) => unknown;
    updateNode: (...args: any) => unknown;
    destroy: (...args: any) => unknown;
    getMode: (...args: any) => unknown;
    getOptions: (...args: any) => unknown;
    getVersion: (...args: any) => unknown;
    isDragging: (...args: any) => unknown;
    getRenderer: (...args: any) => unknown;
    playSound: (...args: any) => unknown;
    plugins: Plugins
    resize: (...args: any) => unknown;
    run: (...args: any) => unknown;
    setMode: (...args: any) => unknown;
    setOptions: (...args: any) => unknown;
    setRenderer: (...args: any) => unknown;
    keys: Keys
    arrowKeys: ArrowKeys
    highlights: Highlights
    markings: Markings
    premoves: Premoves
    sounds: Sounds
    "custom-items": CustomItems
    animationComplete: (...args: any) => unknown;
    getPointerPosition: (...args: any) => unknown;
    isAnimating: (...args: any) => unknown;
    fen: string;
    pgn: string;
    selectedNode: any;
    vml: Vml;
    eco: Eco;
  }
  
  export interface Listener {
    handler: string
    type: string
  }
  
  export interface Logger {
    emit: string
    listeners: any[]
    off: string
    offAll: string
    offMany: string
    on: string
    onAll: string
    onMany: string
    once: string
    clear: string
    get: string
    log: string
    setLogLevel: string
  }
  
  export interface TimeControl {
    get: string
    getType: string
    set: string
  }
  
  export interface Times {
    get: string
    set: string
    setMany: string
  }
  
  export interface Timestamps {
    get: string
    set: string
    setMany: string
  }
  
  export interface Plugins {
    add: string
    addMany: string
    get: string
    has: string
    remove: string
    setCreatePluginContext: string
  }
  
  export interface Keys {
    isPressed: string
    getPressedKeys: string
    setOverrides: string
    removeOverrides: string
  }
  
  export interface ArrowKeys {
    setKeys: string
    resetKeys: string
  }
  
  export interface Highlights {
    addModule: string
    getModules: string
    removeModule: string
    getAll: string
    update: string
    clearState: string
  }
  
  export interface Markings {
    addOne: string
    addMany: string
    getMany: string
    getAll: string
    getAllWhere: string
    getOne: string
    removeAll: string
    removeAllWhere: string
    removeOne: string
    removeMany: string
    toggleMany: string
    toggleOne: string
    factory: Factory
  }
  
  export interface Factory {
    buildStandardAnalysisHighlight: string
    buildStandardArrow: string
  }
  
  export interface Premoves {
    cancel: string
    consumeNext: string
    getLegalMovesForSquare: string
    getLegalMoves: string
    getMove: string
    getPieces: string
    getQueue: string
    isLegalMove: string
    loadQueue: string
    move: string
    reload: string
  }
  
  export interface Sounds {
    getSoundsInstance: string
  }
  
  export interface CustomItems {
    getDefaultStarColor: string
  }
  
  export interface Vml {
    activate: string
    deactivate: string
    emit: string
    listeners: Listener[]
    off: string
    offAll: string
    offMany: string
    on: string
    onAll: string
    onMany: string
    once: string
    getMoveList: string
    isActive: string
    isReady: string
    waitForVMLReady: string
  }
  
  export interface Eco {
    get: string
    update: string
  }
  export interface State {
    playingAs: number | null
    result: string
    isGameOver: boolean
    startingFen: string
    mode: string
  }
  
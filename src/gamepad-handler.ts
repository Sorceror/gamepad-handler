import { AxisInformation } from './axe-utils'
import { ButtonInformation } from './button-utils'
import { GamepadId, GamepadMapping, GamepadOptions, GamepadWithMappings, handleGamepad, linkGamepadToMappings } from './gamepad-utils'
import { isNil } from './utils'

const DEFAULT_ACTION_THROTTLE = 500
const DEFAULT_MIN_THRESHOLD = -0.3
const DEFAULT_MAX_THRESHOLD = 0.3

export enum GamePadHandlerState {
  OFF,
  ON,
}

export class GamePadHandler {
  public readonly window: Window
  private state: GamePadHandlerState = GamePadHandlerState.OFF
  private idToGamepad: Map<GamepadId, GamepadWithMappings> = new Map()
  private availableGamepads: Set<string> = new Set()
  private lastTimestampCheck = 0

  constructor(public gamepadsMapping: Array<GamepadMapping>, public readonly options: GamepadOptions = {}, _window: Window = window) {
    this.window = _window

    this.options.defaultActionThrottle = this.options.defaultActionThrottle || DEFAULT_ACTION_THROTTLE
    this.options.defaultNegativeThreshold = this.options.defaultNegativeThreshold || DEFAULT_MIN_THRESHOLD
    this.options.defaultPositiveThreshold = this.options.defaultPositiveThreshold || DEFAULT_MAX_THRESHOLD
    this.options.listAvailableGamepads = this.options.listAvailableGamepads || false
  }

  public start(): void {
    if (this.window.navigator.getGamepads !== undefined) {
      this.gamepadsMapping.forEach((gp: GamepadMapping) => {
        gp.buttonsMapping.forEach((btn: ButtonInformation) => {
          btn.onPressedNotified = false
          btn.delay = btn.delay || this.options.defaultActionThrottle
        })

        gp.axesMapping.forEach((axis: AxisInformation) => {
          axis.canExecuteAction1 = true
          axis.canExecuteAction2 = true
          axis.delay = axis.delay || this.options.defaultActionThrottle

          axis.positiveThreshold = axis.positiveThreshold || this.options.defaultNegativeThreshold
          axis.negativeThreshold = axis.positiveThreshold || this.options.defaultPositiveThreshold
        })
      })

      this.listen()
    } else {
      console.warn('Browser does not support Gamepad API - https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API')
    }
  }

  public stop(): void {
    this.state = GamePadHandlerState.OFF
  }

  private listen(): void {
    if (this.state === GamePadHandlerState.OFF) {
      this.state = GamePadHandlerState.ON
    }

    // Infinite loop to listen to the state of the game pads and update their internal values (e.g. position, orientation)
    this.requestNextLoop()

    this.window.addEventListener('gamepadconnected', (event) => {
      this.checkGamepadAvailability((event as GamepadEvent).gamepad)
    })

    this.window.addEventListener('gamepaddisconnected', (event) => {
      const gamepad = (event as GamepadEvent).gamepad
      if (isNil(gamepad) === false && this.idToGamepad.has(gamepad.index) === true) {
        this.idToGamepad.delete(gamepad.index)
        const gamepadWithMapping = this.idToGamepad.get(gamepad.index)
        if (gamepadWithMapping) {
          const onDisconnect = gamepadWithMapping.mapping.onDisconnect
          if (onDisconnect !== undefined) {
            onDisconnect(gamepad.index)
          }
        }
      }
    })
  }

  private checkGamepadAvailability(gamepad: Gamepad): void {
    if (isNil(gamepad) === false) {
      if (this.availableGamepads.has(gamepad.id) === false) {
        this.availableGamepads.add(gamepad.id)
        if (this.options.listAvailableGamepads) {
          console.info(`Found available gamepad with id: ${gamepad.id}`)
        }
      }
      if (this.idToGamepad.has(gamepad.index) === false) {
        const gamepadWithMapping = linkGamepadToMappings(gamepad, this.gamepadsMapping)
        if (gamepadWithMapping) {
          if (gamepadWithMapping.mapping.debug) {
            console.info(`Gamepad mapping found for gamepad id: ${gamepadWithMapping.gamepad.id}`)
            console.info(gamepadWithMapping)
          }
          this.idToGamepad.set(gamepad.index, gamepadWithMapping)
          const onConnect = gamepadWithMapping.mapping.onConnect
          if (onConnect !== undefined) {
            onConnect(gamepad.index)
          }
        }
      }
    }
  }

  private pollGamepads(timestamp: number) {
    const gamepads = this.window.navigator.getGamepads()
    if (timestamp - this.lastTimestampCheck > 500) {
      if (isNil(gamepads) === false) {
        for (const gamepad of gamepads) {
          if (gamepad) {
            this.checkGamepadAvailability(gamepad)
          }
        }
      }
      this.lastTimestampCheck = timestamp
    }
    // since Chrome 73 it's necessary to update gamepad instances in between frames
    // gamepad instance is considered only a snapshot of data in time
    for (const gamepad of gamepads) {
      if (gamepad) {
        const connectedGamepad = this.idToGamepad.get(gamepad.index)
        if (connectedGamepad) {
          connectedGamepad.gamepad = gamepad
        }
      }
    }
  }

  private handleGamepads() {
    if (this.idToGamepad.size !== 0) {
      this.idToGamepad.forEach((gamepadWithMapping, index) => {
        if (this.idToGamepad.has(index)) {
          handleGamepad(gamepadWithMapping.gamepad, gamepadWithMapping.mapping, this.window)
        }
      })
    }
  }

  private requestNextLoop() {
    if (this.state !== GamePadHandlerState.OFF) {
      requestAnimationFrame((time) => this.gamepadLoop(time))
    }
  }

  private gamepadLoop(timestamp: number): void {
    this.pollGamepads(timestamp)
    this.handleGamepads()
    this.requestNextLoop()
  }

  public getGamepad(id: GamepadId): Gamepad | undefined {
    const gamepadWithMapping = this.idToGamepad.get(id)
    if (gamepadWithMapping) {
      return gamepadWithMapping.gamepad
    }
    return undefined
  }

  public getAllAvailableGamepadIds(): Set<string> {
    return this.availableGamepads
  }
}

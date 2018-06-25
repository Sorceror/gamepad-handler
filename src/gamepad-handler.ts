import { AxisInformation } from './axe-utils'
import { ButtonInformation } from './button-utils'
import { GamepadMapping, GamepadOptions, GamepadsMapping, handleGamepad, linkGamepadsToMappings } from './gamepad-utils'

const DEFAULT_ACTION_THROTTLE = 500
const DEFAULT_MIN_THRESHOLD = -0.3
const DEFAULT_MAX_THRESHOLD = 0.3

export enum GamePadHandlerState {
  OFF,
  STARTED,
  PAUSED,
  STOPPED,
}

export class GamePadHandler {
  public readonly window: Window
  private state: GamePadHandlerState = GamePadHandlerState.OFF

  constructor(public gamepadsMapping: GamepadsMapping, public readonly options: GamepadOptions = {}, _window: Window = window) {
    this.window = _window

    this.options.defaultActionThrottle = this.options.defaultActionThrottle || DEFAULT_ACTION_THROTTLE
    this.options.defaultNegativeThreshold = this.options.defaultNegativeThreshold || DEFAULT_MIN_THRESHOLD
    this.options.defaultPositiveThreshold = this.options.defaultPositiveThreshold || DEFAULT_MAX_THRESHOLD
  }

  public start(): void {
    if (this.window.navigator.getGamepads !== undefined) {
      this.gamepadsMapping.forEach((gp: GamepadMapping) => {
        gp.buttonsMapping.forEach((btn: ButtonInformation) => {
          btn.canExecuteAction = true
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
    this.state = GamePadHandlerState.STOPPED
  }

  private listen(): void {
    this.window.addEventListener('gamepadconnected', () => {
      if (this.state === GamePadHandlerState.OFF) {
        this.state = GamePadHandlerState.STARTED

        // Infinite loop to listen to the state of the game pads
        requestAnimationFrame(() => this.gamepadLoop(this))
      }
    })
  }

  private gamepadLoop(that: GamePadHandler): void {
    const gamepadList: any = that.window.navigator.getGamepads()
    const gamepads: Array<Gamepad> = []

    for (const gp of gamepadList) {
      if (gp !== null && gp !== undefined) {
        gamepads.push(gp)
      }
    }

    if (gamepads.length === 0) {
      that.state = GamePadHandlerState.OFF
      return
    }

    const gamepadsMapped = linkGamepadsToMappings(gamepads, that.gamepadsMapping)

    gamepadsMapped.forEach((gamepadMapped: [Gamepad, GamepadMapping]) => {
      const [gp, gpMapping] = gamepadMapped
      handleGamepad(gp, gpMapping, that.window)
    })

    if (that.state !== GamePadHandlerState.OFF) {
      requestAnimationFrame(() => that.gamepadLoop(that))
    }
  }
}

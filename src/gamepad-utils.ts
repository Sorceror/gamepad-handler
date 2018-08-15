import { AxisInformation, handleAxis } from './axe-utils'
import { ButtonInformation, handleButton } from './button-utils'
import { isNil } from './utils'

export interface GamepadMapping {
  identifier: string
  buttonsMapping: Array<ButtonInformation>
  axesMapping: Array<AxisInformation>
  debug?: boolean
  onConnect?: (gamepadId: GamepadId) => void
  onDisconnect?: (gamepadId: GamepadId) => void
}

export interface GamepadOptions {
  defaultActionThrottle?: number

  defaultNegativeThreshold?: number
  defaultPositiveThreshold?: number

  listAvailableGamepads?: boolean
}

export type GamepadId = number

export interface GamepadWithMappings {
  gamepad: Gamepad,
  mapping: GamepadMapping
}

export function linkGamepadToMappings(gamepad: Gamepad, gamepadsMapping: Array<GamepadMapping>): GamepadWithMappings | undefined {
  let gamepadMapped: GamepadWithMappings | undefined

  gamepadsMapping.forEach((mapping: GamepadMapping) => {
    if (gamepad.id.includes(mapping.identifier)) {
      gamepadMapped = { gamepad, mapping }
    }
  })

  return gamepadMapped
}

export function handleGamepad(gamepad: Gamepad, gamepadMapping: GamepadMapping, window: Window): void {
  if (gamepad.connected) {
    handleGamePadButtons(gamepad, gamepadMapping, window)
    handleGamePadAxis(gamepad, gamepadMapping, window)
  } else {
    console.warn('Gamepad in disconnected state :/', gamepad)
  }
}

function handleGamePadButtons(gamepad: Gamepad, gamepadMapping: GamepadMapping, window: Window): void {
  if (!gamepadMapping.buttonsMapping || gamepadMapping.buttonsMapping.length === 0) {
    return
  }

  gamepad.buttons.forEach((button: GamepadButton, index: number) => {
    const btnMapped = gamepadMapping.buttonsMapping.find((btnInfo: ButtonInformation) => btnInfo.mappingIndex === index)
    if (!isNil(btnMapped)) {
      handleButton(button, btnMapped, window, gamepadMapping.debug)
    }
  })
}

function handleGamePadAxis(gamepad: Gamepad, gamepadMapping: GamepadMapping, window: Window): void {
  if (!gamepadMapping.axesMapping || gamepadMapping.axesMapping.length === 0) {
    return
  }

  gamepad.axes.forEach((axisValue: number, axisIndex: number) => {
    const axisMapped = gamepadMapping.axesMapping.find((axisInfo: AxisInformation) => axisInfo.mappingIndex === axisIndex)
    if (!isNil(axisMapped)) {
      handleAxis(axisValue, axisIndex, axisMapped, window, gamepadMapping.debug)
    }
  })
}

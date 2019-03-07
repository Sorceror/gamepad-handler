export interface ButtonInformation {
  mappingIndex: number
  btnInfo: string
  throwKeyEvent: boolean
  key?: string
  onPressedNotified?: boolean
  pressed?: boolean
  delay?: number

  onClickAction?(): void
  onPressedAction?(): void
  onHoldAction?(): void
  onReleasedAction?(): void
}

export function handleButton(button: GamepadButton, buttonInformation: ButtonInformation, window: Window, debug: boolean = false) {
  if (debug && button.pressed) {
    console.info('You pressed the button mapped to :', buttonInformation)
  }

  if (button.pressed) {
    onPressed(buttonInformation, window)
  } else {
    onRelease(buttonInformation, window)
  }
}

function onPressed(btnInfo: ButtonInformation, window: Window) {
  if (btnInfo.throwKeyEvent) {
    const e = new KeyboardEvent('keydown', { key: btnInfo.key })
    window.document.dispatchEvent(e)
  }

  if (btnInfo.onPressedNotified && btnInfo.onHoldAction) {
    btnInfo.onHoldAction()
  }

  if (!btnInfo.onPressedNotified && btnInfo.onPressedAction) {
    btnInfo.onPressedNotified = true
    btnInfo.onPressedAction()
  }

  btnInfo.pressed = true
}

function onRelease(btnInfo: ButtonInformation, window: Window) {
  if (btnInfo.pressed) {
    if (btnInfo.throwKeyEvent) {
      const e = new KeyboardEvent('keyup', { key: btnInfo.key })
      window.document.dispatchEvent(e)
    }

    if (btnInfo.onReleasedAction) {
      btnInfo.onPressedNotified = false
      btnInfo.onReleasedAction()
    }

    if (btnInfo.onClickAction) {
      btnInfo.onClickAction()
    }

    btnInfo.pressed = false
  }
}

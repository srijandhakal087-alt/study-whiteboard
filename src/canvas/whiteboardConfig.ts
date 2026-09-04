import type { TLComponents } from 'tldraw'
import { FloatingToolbar } from '../components/FloatingToolbar'
import { RuledBackground } from './RuledBackground'

export const whiteboardComponents: TLComponents = {
  Background: RuledBackground,
  InFrontOfTheCanvas: FloatingToolbar,
}

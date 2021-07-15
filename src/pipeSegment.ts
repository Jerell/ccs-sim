import TreeNode from './treeNode'
import { postOrder } from './traversal'

interface IPipeSeg {
  name: string
  diameter?: number
  length?: number
  flowrate?: number
  roughness?: number
  start?: {
    pressure?: number
    viscosity?: number
    temperature?: number
    x?: number
    y?: number
  }
}

export default class PipeSegment extends TreeNode {
  properties: {
    diameter: number
    length: number
    roughness: number
    flowrate: number
    start: {
      pressure: number
      viscosity: number
      temperature: number
      x: number
      y: number
    }
  }

  constructor(props: IPipeSeg = { name: 'pipeseg' }) {
    super(props)
    this.properties = {
      diameter: props.diameter || 2,
      length: props.length || 200,
      roughness: props.roughness || 0,
      flowrate: props.flowrate || 0,
      start: {
        pressure: (props.start && props.start.pressure) || 2e6,
        viscosity: (props.start && props.start.viscosity) || 0,
        temperature: (props.start && props.start.temperature) || 10,
        x: (props.start && props.start.x) || 0,
        y: (props.start && props.start.y) || 0,
      },
    }
  }

  inflow(): number {
    let sum = 0
    const addFlow = (node: PipeSegment) => (sum += node.properties.flowrate)
    postOrder(this, addFlow)
    return sum
  }

  density(): number {
    // ρ=(Pμ)/(RT)
    const μ = 0.044
    const R = 8.31462
    return Number((this.properties.start.pressure * μ) / (R * this.properties.start.temperature))
  }

  viscosity(): number {
    const μ0 = 0.000018 // Ref viscosity
    const T0 = 373 // Ref temperature
    const C = 240 // Southerland constant
    const T = this.properties.start.temperature
    return μ0 * ((T0 + C) / (T + C)) * (T / T0) ** (3 / 2)
  }

  endPressure(): number {
    const w = this.properties.flowrate
    const D = this.properties.diameter
    const A = 0.25 * Math.PI * this.properties.diameter ** 2
    const ρ = this.density()
    const v = 1 / ρ
    const L = this.properties.length
    const P1 = this.properties.start.pressure

    // Friction factor
    const u = w / (A * ρ)
    const μ = this.viscosity()
    const Re = (ρ * u * D) / μ
    const f = Re < 2000 ? 64 / Re : 0.094 / (D * 1000) ** (1 / 3)

    return (A * Math.sqrt(D)) ** -1 * Math.sqrt(P1) * Math.sqrt(A ** 2 * D * P1 - f * L * v * w ** 2)
  }

  get pressureDrop(): number {
    return this.properties.start.pressure - this.endPressure()
  }

  get pressure(): number {
    return this.endPressure()
  }

  get temperature(): number {
    return this.properties.start.temperature
  }

  pressureContinuity(): boolean {
    return (this.destination as PipeSegment).properties.start.pressure === this.pressure
  }

  addSource(node: TreeNode) {
    super.addSource(node)

    let minChildPressure = this.properties.start.pressure
    const selectLowerPressure = (node: PipeSegment) => {
      const a = minChildPressure
      const b = node.pressure || minChildPressure
      const lower = Math.min(a, b)

      if (node !== this) minChildPressure = Math.min(minChildPressure, node.pressure)
    }
    postOrder(this, selectLowerPressure)

    this.properties.start.pressure = minChildPressure
  }
}

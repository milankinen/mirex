import * as L from "./lens"

const $Mirex: symbol = typeof Symbol !== "undefined" ? Symbol("Mirex") : ("$$Mirex" as any)

namespace Impl {
  const NONE: any = new class None {}()

  type Version = number
  type EffectQueue = Set<Effect>

  let version: Version = 0
  let inTx: boolean = false
  let tracking: Set<ITrackable<any>> | null = null
  let effs: EffectQueue = new Set()

  interface IPullable<T> {
    pull(): T
  }

  interface ITrackable<T> {
    track(listener: INotifiable<T>): ITracking
  }

  interface ITracking {
    untrack(): void
  }

  interface INotifiable<T> {
    notify(): void
  }

  interface IAtom<T> {
    set(f: (val: T) => T): void
    get(): T
  }

  type TrackedValues = Map<ITrackable<any>, ITracking>

  interface GetCachedResult<T> {
    value: T
    cached: boolean
  }

  /**
   * Base reactive value with tracking and pulling support.
   */
  export abstract class Value<T> implements ITrackable<T>, IPullable<T> {
    protected thead: TrackNode<T> | null = null

    public abstract pull(): T

    public track(listener: INotifiable<T>): TrackNode<T> {
      const node = new TrackNode(this, listener, null, this.thead)
      if (this.thead !== null) {
        this.thead.head = node
      }
      this.thead = node
      return node
    }

    public teardown(): void {
      this.thead = null
    }

    protected notifyListeners(): void {
      let node = this.thead
      while (node !== null) {
        node.li.notify()
        node = node.tail
      }
    }
  }

  class TrackNode<T> implements ITracking {
    constructor(
      public val: Value<T>,
      public li: INotifiable<T>,
      public head: TrackNode<T> | null,
      public tail: TrackNode<T> | null,
    ) {}

    public untrack(): void {
      const { head, tail } = this
      if (head === null && tail === null) {
        // was last track node, should stop tracking if any
        this.val.teardown()
      } else {
        if (tail !== null) {
          tail.head = head
        }
        if (head !== null) {
          head.tail = tail
        }
      }
    }
  }

  export class Atom<T> extends Value<T> implements IAtom<T> {
    constructor(protected val: T) {
      super()
    }

    public pull(): T {
      if (tracking !== null) {
        tracking.add(this)
      }
      return this.val
    }

    public get(): T {
      return this.val
    }

    public set(f: (val: T) => T): void {
      const prev = this.val
      const next = (this.val = f(prev))
      if (next !== prev) {
        this.notifyListeners()
      }
    }
  }

  export class Cursor<T> extends Value<T> implements IAtom<T>, INotifiable<T> {
    private tracking: ITracking | null = null
    private cache: T = NONE
    private ver: Version = -1

    constructor(private src: IAtom<any> & ITrackable<any>, private lens: any) {
      super()
    }

    public pull(): T {
      if (tracking !== null) {
        tracking.add(this)
        if (this.tracking === null) {
          this.tracking = this.src.track(this)
        }
      }
      return this.get()
    }

    public get(): T {
      if (this.ver < version) {
        this.ver = version
        const { lens } = this
        const root = this.src.get()
        this.cache = typeof lens === "function" ? L.get(lens as any, root) : (root as any)[lens]
      }
      return this.cache
    }

    public set(f: (val: T) => T): void {
      const { lens } = this
      if (typeof lens === "function") {
        this.src.set(s => L.over(lens as any, f, s))
      } else if (typeof lens === "string") {
        this.src.set(s => Object.assign({}, s, { [lens]: f(s[lens]) }))
      } else if (typeof lens === "number") {
        this.src.set(s => {
          const copy = s.slice()
          copy[lens] = f(copy[lens])
          return copy
        })
      } else {
        throw new Error("Invalid lens: ")
      }
    }

    public notify(): void {
      const prev = this.cache
      const next = this.get()
      if (prev !== next) {
        this.notifyListeners()
      }
    }
  }

  export class Reaction<T> extends Value<T> implements INotifiable<any> {
    protected rver: Version = -1 // read version
    protected nver: Version = -1 // notified version
    protected tvals: TrackedValues = new Map()
    protected cache: T = NONE

    constructor(protected f: () => T) {
      super()
    }

    public pull(): T {
      if (tracking !== null) {
        tracking.add(this)
        return this.compute(true)
      } else {
        return this.compute(false)
      }
    }

    public teardown(): void {
      this.thead = null
      const { tvals } = this
      tvals.forEach(tracking => tracking.untrack())
      tvals.clear()
    }

    public notify(): void {
      if (this.nver < version) {
        const prev = this.cache
        this.nver = version
        const next = this.compute(true)
        if (prev !== next) {
          this.notifyListeners()
        }
      }
    }

    protected compute(track: boolean): T {
      return track === true ? this.tracked() : this.cached().value
    }

    private tracked(): T {
      const stacked = tracking
      try {
        const trackedNow = (tracking = new Set())
        const result = this.cached()
        if (result.cached === false) {
          const { tvals } = this
          trackedNow.forEach(trackable => {
            if (!tvals.has(trackable)) {
              tvals.set(trackable, trackable.track(this))
            }
          })
          tvals.forEach((tracking, trackable) => {
            if (!trackedNow.has(trackable)) {
              tracking.untrack()
              tvals.delete(trackable)
            }
          })
        }
        return result.value
      } finally {
        tracking = stacked
      }
    }

    private cached(): GetCachedResult<T> {
      if (this.rver < version) {
        const body = this.f
        this.rver = version
        return {
          value: this.cache = body(),
          cached: false,
        }
      } else {
        return {
          value: this.cache,
          cached: true,
        }
      }
    }
  }

  export class Effect extends Reaction<void> {
    constructor(f: () => void) {
      super(f)
    }

    public run(): void {
      if (this.f !== null) {
        const track = true
        this.compute(track)
      }
    }

    public stop(): void {
      this.f = null as any
    }

    public notify(): void {
      if (!effs.has(this)) {
        effs.add(this)
      }
    }
  }

  function runEffs(): void {
    effs.forEach(eff => {
      effs.delete(eff)
      eff.run()
    })
  }

  export function transact<T>(f: () => T): T {
    const wasInTx = inTx
    ++version
    inTx = true
    const result = f()
    inTx = wasInTx
    if (wasInTx === false) {
      runEffs()
    }
    return result
  }
}

function createValue<T>(impl: Impl.Value<T>): Value<T> {
  const value = ((): any => impl.pull()) as any
  value[$Mirex] = impl
  return value
}

function implOf<T>(val: Value<T>): Impl.Value<T> {
  return (val as any)[$Mirex]
}

// public api

export interface Value<T> {
  (): T
}

export interface Atom<T> extends Value<T> {}

export interface Cursor<T> extends Atom<T> {}

export interface Reaction<T> extends Value<T> {}

export type Untrack = () => void

export function atom<T>(value: T): Atom<T> {
  return createValue(new Impl.Atom(value)) as Atom<T>
}

export function cursor<T, P extends keyof T>(value: Atom<T>, prop: P): Cursor<T[P]> {
  return createValue(new Impl.Cursor(implOf(value) as Impl.Atom<T>, prop))
}

export function reaction<T>(body: () => T): Reaction<T> {
  return createValue(new Impl.Reaction(body))
}

export function track(body: () => void): Untrack {
  const eff = new Impl.Effect(body)
  eff.run()
  return function untrack(): void {
    eff.stop()
  }
}

export function transact<T>(f: () => T): T {
  return Impl.transact(f)
}

export function swap<T>(atom: Atom<T>, f: (current: T) => T): T {
  return transact(() => {
    const impl = implOf(atom) as Impl.Atom<T>
    impl.set(f)
    return impl.get()
  })
}

export function reset<T>(atom: Atom<T>, val: T): T {
  return swap(atom, () => val)
}

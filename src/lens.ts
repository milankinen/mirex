// this module supports van Laarhoven lenses

export interface Functor<A> {
  fmap<B>(fn: (a: A) => B): FunctorImpl<B>
}

export type Lens<S, A> = (a2f: (a: A) => FunctorImpl<A>) => (s: S) => FunctorImpl<S>

export function get<S, A>(lens: Lens<S, A>, s: S): A {
  return ((lens(constF)(s) as any) as FunctorImpl<A>).val
}

export function over<S, A>(lens: Lens<S, A>, f: (a: A) => A, s: S): S {
  return ((lens((a: A) => idF(f(a)))(s) as any) as FunctorImpl<S>).val
}

interface FunctorImpl<A> extends Functor<A> {
  fmap<B>(fn: (a: A) => B): FunctorImpl<B>
  val: A
}

function constF<T>(val: T): FunctorImpl<T> {
  return new Const(val)
}

function idF<T>(val: T): FunctorImpl<T> {
  return new Id(val)
}

class Const<A> implements FunctorImpl<A> {
  constructor(public val: A) {}
  public fmap<B>(fn: (a: A) => B): FunctorImpl<B> {
    return (this as any) as FunctorImpl<B>
  }
  public map<B>(fn: (a: A) => B): FunctorImpl<B> {
    return this.fmap(fn)
  }
  public ["fantasy-land/map"]<B>(fn: (a: A) => B): FunctorImpl<B> {
    return this.fmap(fn)
  }
}

class Id<A> implements FunctorImpl<A> {
  constructor(public val: A) {}
  public fmap<B>(fn: (a: A) => B): FunctorImpl<B> {
    return new Id(fn(this.val))
  }
  public map<B>(fn: (a: A) => B): FunctorImpl<B> {
    return this.fmap(fn)
  }
  public ["fantasy-land/map"]<B>(fn: (a: A) => B): FunctorImpl<B> {
    return this.fmap(fn)
  }
}

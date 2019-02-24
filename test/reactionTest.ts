import { atom, reaction, reset, track } from "../src/index"
import { run } from "./_runner"

describe("reactions", () => {
  it("are re-computed every time when the dependency state changes", () => {
    const rec = run(record => {
      const str = atom("Lol")
      const msg = reaction(() => `${str()}!`)

      track(() => {
        record(msg())
      })
      reset(str, "Bal")
      reset(str, "Tsers")
    })
    expect(rec).toMatchInlineSnapshot(`
Array [
  "Lol!",
  "Bal!",
  "Tsers!",
]
`)
  })

  it("skip duplicate values", () => {
    const rec = run(record => {
      const str = atom("Lol")
      const len = reaction(() => str().length)

      track(() => {
        record(len())
      })
      reset(str, "Bal")
      reset(str, "Tsers")
    })
    expect(rec).toMatchInlineSnapshot(`
Array [
  3,
  5,
]
`)
  })

  it("support multiple calls to same dependency", () => {
    const rec = run(record => {
      const str = atom("Foo")
      const msg = reaction(() => `${str()}, ${str()}`)

      track(() => {
        record(msg())
      })
      reset(str, "Bar")
    })
    expect(rec).toMatchInlineSnapshot(`
Array [
  "Foo, Foo",
  "Bar, Bar",
]
`)
  })

  it("support multiple different dependencies", () => {
    const rec = run(record => {
      const greeting = atom("Hello")
      const name = atom("John")
      const msg = reaction(() => `${greeting()} ${name()}!`)

      track(() => {
        record(msg())
      })
      reset(greeting, "Tsers")
      reset(name, "Doe")
    })
    expect(rec).toMatchInlineSnapshot(`
Array [
  "Hello John!",
  "Tsers John!",
  "Tsers Doe!",
]
`)
  })
})

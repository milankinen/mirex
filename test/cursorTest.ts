import { atom, cursor, reset, track } from "../src/index"
import { run } from "./_runner"

describe("cursors", () => {
  it("track the focused sub-state only", () => {
    const rec = run((record, wait) => {
      const root = atom({ message: "Hello", num: 123 })
      const msg = cursor(root, "message")
      track(() => {
        record(msg())
      })
      wait(10, () => {
        reset(root, { message: "Lolbal", num: 123 })
      })
      wait(20, () => {
        reset(root, { message: "Tsers", num: 123 })
      })
    })
    expect(rec).toMatchInlineSnapshot(`
Array [
  "Hello",
  "Lolbal",
  "Tsers",
]
`)
  })

  it("skip duplicate values", () => {
    const rec = run((record, wait) => {
      const root = atom({ message: "Hello", num: 123 })
      const msg = cursor(root, "message")
      track(() => {
        record(msg())
      })
      wait(10, () => {
        reset(root, { message: "Hello", num: 124 })
      })
      wait(20, () => {
        reset(root, { message: "Tsers", num: 124 })
      })
    })
    expect(rec).toMatchInlineSnapshot(`
Array [
  "Hello",
  "Tsers",
]
`)
  })

  it("allow bi-directional modifications wrt root state", () => {
    const rec = run((record, wait) => {
      const root = atom({ message: "Hello", num: 123 })
      const msg = cursor(root, "message")
      track(() => {
        record(root())
      })
      wait(10, () => {
        reset(msg, "Tsers!")
      })
    })
    expect(rec).toMatchInlineSnapshot(`
Array [
  Object {
    "message": "Hello",
    "num": 123,
  },
  Object {
    "message": "Tsers!",
    "num": 123,
  },
]
`)
  })
})

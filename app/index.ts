import { test } from "./test";

export default {
  fetch(req: Request) {
    return Response.json({ message: test() });
  },
};

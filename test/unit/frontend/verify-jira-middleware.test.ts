/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt from "atlassian-jwt";

describe("#verifyJiraMiddleware", () => {
  let res;
  let next;
  let verifyJiraMiddleware;


  beforeEach(async () => {
    res = td.object(["sendStatus"]);
    res.locals = {};
    next = td.function("next");
    verifyJiraMiddleware = (await import("../../../src/frontend/verify-jira-middleware")).default;
  });

  describe("GET request", () => {
    const buildRequest = (jiraHost, secret = "secret"): any => {
      const jwtValue = jwt.encode("test-jwt", secret);

      return {
        query: {
          xdm_e: jiraHost,
          jwt: jwtValue
        },
        addLogFields: () => undefined
      };
    };

    it("should call next with a valid token and secret", async () => {
      const req = buildRequest("test-host", "secret");

      td.when(models.Installation.getForHost("test-host"))
        .thenResolve({
          jiraHost: "test-host",
          sharedSecret: "secret"
        });

      td.when(jwt.decode(req.query.jwt, "secret"));

      await verifyJiraMiddleware(req, res, next);

      td.verify(next());
    });

    it("sets res.locals to installation", async () => {
      const req = buildRequest("host", "secret");

      const installation = { jiraHost: "host", sharedSecret: "secret" };
      td.when(models.Installation.getForHost("host")).thenResolve(installation);
      td.when(jwt.decode(req.query.jwt, "secret"));

      await verifyJiraMiddleware(req, res, next);

      expect(res.locals.installation).toEqual(installation);
    });

    it("should return a 404 for an invalid installation", async () => {
      const req = buildRequest("host");

      td.when(models.Installation.getForHost("host")).thenResolve();

      await verifyJiraMiddleware(req, res, next);

      td.verify(next(td.matchers.contains(new Error("Not Found"))));
    });

    it("should return a 401 for an invalid jwt", async () => {
      const req = buildRequest("good-host", "wrong-secret");

      td.when(models.Installation.getForHost("good-host"))
        .thenResolve({
          jiraHost: "good-host",
          sharedSecret: "secret"
        });

      await verifyJiraMiddleware(req, res, next);

      td.verify(next(td.matchers.contains(new Error("Unauthorized"))));
    });

    it("adds installation details to log", async () => {
      const req = buildRequest("host", "secret");
      const addLogFieldsSpy = jest.spyOn(req, "addLogFields");

      const installation = { jiraHost: "host", sharedSecret: "secret", clientKey: "abcdef" };
      td.when(models.Installation.getForHost("host")).thenResolve(installation);
      td.when(jwt.decode(req.query.jwt, "secret"));

      await verifyJiraMiddleware(req, res, next);

      expect(addLogFieldsSpy).toHaveBeenCalledWith({
        jiraHost: installation.jiraHost,
        jiraClientKey: installation.clientKey
      });
    });
  });

  describe("POST request", () => {
    const buildRequest = (jiraHost, secret): any => {
      const encodedJwt = secret && jwt.encode("test-jwt", secret);

      return {
        body: {
          jiraHost,
          token: encodedJwt
        },
        addLogFields: () => undefined
      };
    };

    it("pulls jiraHost and token from body", async () => {
      const req = buildRequest("host", "secret");
      const installation = { jiraHost: "host", sharedSecret: "secret" };

      td.when(models.Installation.getForHost("host")).thenResolve(installation);
      td.when(jwt.decode(req.body.token, "secret"));

      await verifyJiraMiddleware(req, res, next);

      td.verify(next());
    });

    it("is not found when host is missing", async () => {
      const req = buildRequest("host", "secret");

      td.when(models.Installation.getForHost("host")).thenResolve();

      await verifyJiraMiddleware(req, res, next);

      td.verify(next(td.matchers.contains(new Error("Not Found"))));
    });

    it("is unauthorized when token missing", async () => {
      const req = buildRequest("host", "secret");
      const installation = { jiraHost: "host", sharedSecret: "secret" };

      td.when(models.Installation.getForHost("host")).thenResolve(installation);

      await verifyJiraMiddleware(req, res, next);

      td.verify(next(td.matchers.contains(new Error("Unauthorized"))));
    });
  });
});
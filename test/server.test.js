import {describe, expect} from "@jest/globals";

const request = require("supertest");
const app = require("../src/server/index.js");

describe("Root path being tested here", () => {
    test("Should response with GET method", done => {
        request(app)
            .get("/")
            .then(response => {
                expect(response.statusCode).toBe(200);
                done();
            });
    });
});
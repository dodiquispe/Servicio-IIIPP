<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Current GraphQL authentication and admission API

Copy `.env.example` to `.env` and set the PostgreSQL connection values. Generate
a unique JWT secret locally (64 hexadecimal characters, or 32 random bytes)
and put it in `.env`; do not commit or share it. From PowerShell in the backend
directory, generate one with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set `JWT_SECRET` in the local `.env` file to a secret of at least 32 bytes. Do
not commit or share it. `loginUsuario` returns a 30-minute `accessToken`; send
it as `Authorization: Bearer <accessToken>` for protected queries and mutations.
Only admission, service catalog, and availability operations are public.

The `atencion` module exposes cases, reservations, rescheduling, session notes,
weekly agendas, and date-specific agenda blocks. Practitioners can only read
cases assigned to their own account. Staff mutations enforce their assigned
role.

Administrators can query `reporteCargaServicios(periodo, fecha)` with `periodo`
set to `DIA`, `SEMANA`, or `MES` and `fecha` in `YYYY-MM-DD` format. The report
returns the inclusive date range and active services with distinct cases that
had a recorded session and the total sessions registered in that range.

Payments are not enabled. New reservations are confirmed without payment and
leave `monto`, `estado_pago`, `id_transaccion_pasarela`, and `vence_pago` empty.
When the provider is integrated, start a 10-minute hold with
`AtencionService.iniciarRetencionDePago`. Send the provider the reservation ID,
case code, amount/currency, idempotency key, return URL, and a backend callback
URL. Confirm payment only after validating the signed callback, transaction
status, reservation ID, and exact amount; then call the internal
`AtencionService.confirmarPago`. It is intentionally not exposed as a public
GraphQL mutation. Expired holds are cancelled by the backend.

The public booking calendar shows dates in seven-day pages. New reservations
appear in the secretary reservation panel until confirmed as successful; this
status does not represent a payment. For an existing patient, availability
stays with their active case practitioner while that assignment is in force.
The service responsible is offered only after the practitioner's assignment
ends.

Staff vacation deactivation keeps the account, role links, service
assignments, and case history; it disables sign-in until reactivated. Finalizing
an assignment also preserves historical records. Session notes keep both the
registering user's ID and their name at the time of registration.

## Legacy authentication instructions (not current)

Configure `JWT_SECRET` in the local `.env` file with at least 32 random bytes.
Do not commit or share the secret. GraphQL login uses the username and the
person's CI as the initial password:

```graphql
mutation {
  login(loginInput: { nombre_usuario: "usuario.apellido", contrasena: "CI" }) {
    accessToken
    requiresPasswordChange
  }
}
```

For a first login or after a subadministrator reset, `requiresPasswordChange`
is `true`. Send that token as `Authorization: Bearer <accessToken>` and change
the password before using other protected operations:

```graphql
mutation {
  changeInitialPassword(newPassword: "una-frase-secreta-larga") {
    accessToken
    requiresPasswordChange
  }
}
```

Use the returned token for subsequent requests. Passwords are stored as scrypt
hashes; the CI is used only as the initial/reset credential. A subadministrator
(role `id_sec = 2`) can reset a user's password to their CI:

```graphql
mutation {
  resetUserPassword(userId: "ID_DEL_USUARIO")
}
```

After a reset, the user must log in with the CI and change it again.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

This project is already instrumented. Create a free account at [observe.nestjs.com](https://observe.nestjs.com), add an application, and paste the generated app key and secret into the `ObserveModule.forRoot()` call in `src/app.module.ts`.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

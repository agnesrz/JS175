'use strict';

const HTTP = require('http');
const URL = require('url').URL;
const PORT = 3000;

const HTML_START = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Loan Calculator</title>
    <style type="text/css">
      body {
        background: rgba(250, 250, 250);
        font-family: sans-serif;
        color: rgb(50, 50, 50);
      }

      article {
        width: 100%;
        max-width: 40rem;
        margin: 0 auto;
        padding: 1rem 2rem;
      }

      h1 {
        font-size: 2.5rem;
        text-align: center;
      }

      table {
        font-size: 2rem;
      }

      th {
        text-align: right;
      }
    </style>
  </head>
  <body>
    <article>
      <h1>Loan Calculator</h1>
      <table>
        <tbody>`;

const HTML_END = `
        </tbody>
      </table>
    </article>
  </body>
</html>`;

const SERVER = HTTP.createServer((req, res) => {
  let path = req.url;
  let params = new URL(path, `http://localhost:${PORT}`).searchParams;
  let content = loanCalculator(params.get('amount'), params.get('duration'));

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.write(HTML_START + content + HTML_END);
  res.end();
});

function loanCalculator(amount, durationInYears) {

  amount = Number(amount);
  durationInYears = Number(durationInYears);

  const APR = 5;
  let monthlyInterest = (APR / 12) / 100;
  let durationInMonths = durationInYears * 12;
  let monthlyPayment = (amount * (monthlyInterest / (1 - Math.pow((1 + monthlyInterest), (-durationInMonths))))).toFixed(2);

  return `<tr>
            <th>Amount:</th>
            <td><a href='/?amount=${amount - 100}&duration=${durationInMonths}'>- 100</a></td>
            <td>$${amount}</td>
            <td><a href='/?amount=${amount + 100}&duration=${durationInMonths}'>+ 100</a></td>
          </tr>
          <tr>
            <th>Duration:</th>
            <td><a href='/?amount=${amount}&duration=${durationInMonths - 1}'>- 1 year</a></td>
            <td>${durationInYears} years</td>
            <td><a href='/?amount=${amount}&duration=${durationInMonths + 1}'>+ 1 year</a></td>
          </tr>
          <tr>
            <th>APR:</th>
            <td colspan='3'>${APR}%</td>
          </tr>
          <tr>
            <th>Monthly payment:</th>
            <td colspan='3'>$${monthlyPayment}</td>
          </tr>`;
}

SERVER.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
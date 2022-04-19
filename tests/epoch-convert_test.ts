import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";
// import * as ClarityType from '@stacks/transactions';
// import { intCV, tupleCV, uintCV, stringAsciiCV } from '@stacks/transactions/dist/clarity/types';

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const utcTimeStamp = Date.parse(new Date().toString()) / 1000;

Clarinet.test({
  name: "Ensure that leap years are identified correctly!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;

    let isLeapYear = chain.callReadOnlyFn(
      "epoch-convert",
      "is-leap-year",
      [types.uint(1972)],
      deployer.address
    );
    isLeapYear.result.expectBool(true);
  },
});

Clarinet.test({
  name: "Ensure that non-leap years are identified correctly!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;

    let isLeapYear = chain.callReadOnlyFn(
      "epoch-convert",
      "is-leap-year",
      [types.uint(1975)],
      deployer.address
    );
    isLeapYear.result.expectBool(false);
  },
});

Clarinet.test({
  name: "Ensure that count of leap years since 1970 is identified correctly!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;

    let getLeapYears = chain.callReadOnlyFn(
      "epoch-convert",
      "get-leap-years-since-1970",
      [types.uint(2022)],
      deployer.address
    );
    getLeapYears.result.expectUint(13);
  },
});

Clarinet.test({
  name: "Ensure that current year is identified correctly!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const time_stamp = Math.floor(Date.now() / 1000);
    let getYears = chain.callReadOnlyFn(
      "epoch-convert",
      "get-year",
      [types.uint(utcTimeStamp)],
      deployer.address
    );
    getYears.result.expectUint(new Date().getUTCFullYear());
  },
});

Clarinet.test({
  name: "Ensure that current month is identified correctly!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const time_stamp = Math.floor(Date.now() / 1000);
    let getMonths = chain.callReadOnlyFn(
      "epoch-convert",
      "get-month",
      [types.uint(utcTimeStamp)],
      deployer.address
    );
    let correctMonth = months[new Date().getUTCMonth()];
    getMonths.result.expectAscii(correctMonth);
  },
});

Clarinet.test({
  name: "Ensure that current weekday is identified correctly!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const time_stamp = Math.floor(Date.now() / 1000);
    let getWeekDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-week-days",
      [types.uint(utcTimeStamp)],
      deployer.address
    );
    let correctWeekDay = weekDays[new Date().getUTCDay()];
    getWeekDays.result.expectAscii(correctWeekDay);
  },
});

Clarinet.test({
  name: "Ensure that current day is identified correctly!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const time_stamp = Math.floor(Date.now() / 1000);
    let getDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-day",
      [types.uint(utcTimeStamp)],
      deployer.address
    );
    let day = new Date().getUTCDate();
    getDays.result.expectUint(day);
  },
});

Clarinet.test({
  name: "Ensure that current hours is identified correctly!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let getHours = chain.callReadOnlyFn(
      "epoch-convert",
      "get-hours",
      [types.uint(utcTimeStamp)],
      deployer.address
    );
    let hours = new Date().getUTCHours(); // those who are in GMT time zone please remove 5
    getHours.result.expectUint(hours);
  },
});

Clarinet.test({
  name: "Ensure that current minutes is identified correctly!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    const time_stamp = Math.floor(Date.now() / 1000);
    let getMinutes = chain.callReadOnlyFn(
      "epoch-convert",
      "get-minutes",
      [types.uint(utcTimeStamp)],
      deployer.address
    );
    let minutes = new Date().getUTCMinutes();
    getMinutes.result.expectUint(minutes);
  },
});

// If I try to run this test it gives 1 second difference error due to execution time
// Clarinet.test({
//     name: "Ensure that current seconds is identified correctly!",
//     async fn(chain: Chain, accounts: Map<string, Account>) {
//         const deployer = accounts.get('deployer')!;
//         const time_stamp = Math.floor(Date.now() / 1000);
//         let seconds = new Date().getUTCSeconds();
//         let getSeconds = chain.callReadOnlyFn('epoch-convert', 'get-seconds', [types.uint(utcTimeStamp)], deployer.address);
//         getSeconds.result.expectUint(seconds);
//     },
// });

Clarinet.test({
  name: "Ensure that time-stamp values like 28th and 29th feb land on leap years!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let time_stamp = 68083200; // Monday, February 28, 1972 12:00:00 AM
    let getMonths = chain.callReadOnlyFn(
      "epoch-convert",
      "get-month",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-day",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getWeekDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-week-days",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays.result.expectAscii("Monday");
    // let minutes = new Date().getUTCMinutes();
    getMonths.result.expectAscii("February");
    getDays.result.expectUint(28);

    time_stamp = 68169600; // Tuesday, February 29, 1972 12:00:00 AM
    getMonths = chain.callReadOnlyFn(
      "epoch-convert",
      "get-month",
      [types.uint(time_stamp)],
      deployer.address
    );
    getDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-day",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-week-days",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays.result.expectAscii("Tuesday");
    // let minutes = new Date().getUTCMinutes();
    getMonths.result.expectAscii("February");
    getDays.result.expectUint(29);

    time_stamp = 68256000; // Wednesday, March 1, 1972 12:00:00 AM
    getMonths = chain.callReadOnlyFn(
      "epoch-convert",
      "get-month",
      [types.uint(time_stamp)],
      deployer.address
    );
    getDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-day",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-week-days",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays.result.expectAscii("Wednesday");
    // let minutes = new Date().getUTCMinutes();
    getMonths.result.expectAscii("March");
    getDays.result.expectUint(1);
  },
});

Clarinet.test({
  name: "Ensure that time-stamp values like 29th Feb land on 1st March on non-leap years!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let time_stamp = 99791999; // Wednesday, February 28, 1973 11:59:59 PM
    let getMonths = chain.callReadOnlyFn(
      "epoch-convert",
      "get-month",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-day",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getWeekDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-week-days",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays.result.expectAscii("Wednesday");
    // let minutes = new Date().getUTCMinutes();
    getMonths.result.expectAscii("February");
    getDays.result.expectUint(28);
    time_stamp++;

    getMonths = chain.callReadOnlyFn(
      "epoch-convert",
      "get-month",
      [types.uint(time_stamp)],
      deployer.address
    );
    getDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-day",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-week-days",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays.result.expectAscii("Thursday");
    // let minutes = new Date().getUTCMinutes();
    getMonths.result.expectAscii("March");
    getDays.result.expectUint(1);
  },
});

Clarinet.test({
  name: "Ensure that timestamp values land on days like 31-Dec and 01-Jan in leap years",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let time_stamp = 94694399; // Sunday, December 31, 1972 11:59:59 PM
    let getMonths = chain.callReadOnlyFn(
      "epoch-convert",
      "get-month",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-day",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getWeekDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-week-days",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays.result.expectAscii("Sunday");
    // let minutes = new Date().getUTCMinutes();
    getMonths.result.expectAscii("December");
    getDays.result.expectUint(31);
    time_stamp++;

    getMonths = chain.callReadOnlyFn(
      "epoch-convert",
      "get-month",
      [types.uint(time_stamp)],
      deployer.address
    );
    getDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-day",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-week-days",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays.result.expectAscii("Monday");
    // let minutes = new Date().getUTCMinutes();
    getMonths.result.expectAscii("January");
    getDays.result.expectUint(1);
  },
});

Clarinet.test({
  name: "Ensure that timestamp values land on days like 31-Dec and 01-Jan in non-leap years",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let time_stamp = 126230399; // Monday, December 31, 1973 11:59:59 PM
    let getMonths = chain.callReadOnlyFn(
      "epoch-convert",
      "get-month",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-day",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getWeekDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-week-days",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays.result.expectAscii("Monday");
    // let minutes = new Date().getUTCMinutes();
    getMonths.result.expectAscii("December");
    getDays.result.expectUint(31);
    time_stamp++;

    getMonths = chain.callReadOnlyFn(
      "epoch-convert",
      "get-month",
      [types.uint(time_stamp)],
      deployer.address
    );
    getDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-day",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-week-days",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays.result.expectAscii("Tuesday");
    // let minutes = new Date().getUTCMinutes();
    getMonths.result.expectAscii("January");
    getDays.result.expectUint(1);
  },
});

// this test might fail sometime due to a split difference in seconds
Clarinet.test({
  name: "Ensure that human-readable time-stamp is correct!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let humanReadable = chain.callReadOnlyFn(
      "epoch-convert",
      "human-readable",
      [types.uint(utcTimeStamp)],
      deployer.address
    );
    humanReadable.result.expectTuple();
    let readable = types.tuple({
      day: types.uint(new Date().getUTCDate()),
      hour: types.uint(new Date().getUTCHours()),
      minute: types.uint(new Date().getUTCMinutes()),
      month: types.ascii(months[new Date().getUTCMonth()]),
      second: types.uint(new Date().getUTCSeconds()),
      week_day: types.ascii(weekDays[new Date().getUTCDay()]),
      year: types.uint(new Date().getUTCFullYear()),
    });
    // this removes spaces between the tuple
    let a = readable.replace(/\s+/g, '');
    let b = humanReadable.result.replace(/\s+/g, '');
    assertEquals(a, b);
  },
});

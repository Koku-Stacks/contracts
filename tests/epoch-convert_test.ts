import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from "https://deno.land/x/clarinet@v0.14.0/index.ts";
import { assertEquals } from "https://deno.land/std@0.90.0/testing/asserts.ts";

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
const utcTimeStamp = 1650469238; // Wednesday, April 20, 2022 3:40:38 PM

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
    let getYears = chain.callReadOnlyFn(
      "epoch-convert",
      "get-year",
      [types.uint(utcTimeStamp)],
      deployer.address
    );
    getYears.result.expectUint(2022);
  },
});

Clarinet.test({
  name: "Ensure that current month is identified correctly!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let getMonths = chain.callReadOnlyFn(
      "epoch-convert",
      "get-month",
      [types.uint(utcTimeStamp)],
      deployer.address
    );
    let correctMonth = months[3];
    getMonths.result.expectAscii(correctMonth);
  },
});

Clarinet.test({
  name: "Ensure that current weekday is identified correctly!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let getWeekDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-week-days",
      [types.uint(utcTimeStamp)],
      deployer.address
    );
    let correctWeekDay = weekDays[3];
    getWeekDays.result.expectAscii(correctWeekDay);
  },
});

Clarinet.test({
  name: "Ensure that current day is identified correctly!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let getDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-day",
      [types.uint(utcTimeStamp)],
      deployer.address
    );
    getDays.result.expectUint(20);
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
    getHours.result.expectUint(15);
  },
});

Clarinet.test({
  name: "Ensure that current minutes is identified correctly!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let getMinutes = chain.callReadOnlyFn(
      "epoch-convert",
      "get-minutes",
      [types.uint(utcTimeStamp)],
      deployer.address
    );
    getMinutes.result.expectUint(40);
  },
});

Clarinet.test({
  name: "Ensure that current seconds is identified correctly!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let getSeconds = chain.callReadOnlyFn(
      "epoch-convert",
      "get-seconds",
      [types.uint(utcTimeStamp)],
      deployer.address
    );
    getSeconds.result.expectUint(38);
  },
});

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
    let getYears = chain.callReadOnlyFn(
      "epoch-convert",
      "get-year",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-day",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getHours = chain.callReadOnlyFn(
      "epoch-convert",
      "get-hours",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getMinutes = chain.callReadOnlyFn(
      "epoch-convert",
      "get-minutes",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getSeconds = chain.callReadOnlyFn(
      "epoch-convert",
      "get-seconds",
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
    getMonths.result.expectAscii("February");
    getYears.result.expectUint(1972);
    getDays.result.expectUint(28);
    getHours.result.expectUint(0);
    getMinutes.result.expectUint(0);
    getSeconds.result.expectUint(0);

    time_stamp = 68169600; // Tuesday, February 29, 1972 12:00:00 AM
    getMonths = chain.callReadOnlyFn(
      "epoch-convert",
      "get-month",
      [types.uint(time_stamp)],
      deployer.address
    );
    getYears = chain.callReadOnlyFn(
      "epoch-convert",
      "get-year",
      [types.uint(time_stamp)],
      deployer.address
    );
    getDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-day",
      [types.uint(time_stamp)],
      deployer.address
    );
    getHours = chain.callReadOnlyFn(
      "epoch-convert",
      "get-hours",
      [types.uint(time_stamp)],
      deployer.address
    );
    getMinutes = chain.callReadOnlyFn(
      "epoch-convert",
      "get-minutes",
      [types.uint(time_stamp)],
      deployer.address
    );
    getSeconds = chain.callReadOnlyFn(
      "epoch-convert",
      "get-seconds",
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
    getMonths.result.expectAscii("February");
    getYears.result.expectUint(1972);
    getDays.result.expectUint(29);
    getHours.result.expectUint(0);
    getMinutes.result.expectUint(0);
    getSeconds.result.expectUint(0);

    time_stamp = 68256000; // Wednesday, March 1, 1972 12:00:00 AM
    getMonths = chain.callReadOnlyFn(
      "epoch-convert",
      "get-month",
      [types.uint(time_stamp)],
      deployer.address
    );
    getYears = chain.callReadOnlyFn(
      "epoch-convert",
      "get-year",
      [types.uint(time_stamp)],
      deployer.address
    );
    getDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-day",
      [types.uint(time_stamp)],
      deployer.address
    );
    getHours = chain.callReadOnlyFn(
      "epoch-convert",
      "get-hours",
      [types.uint(time_stamp)],
      deployer.address
    );
    getMinutes = chain.callReadOnlyFn(
      "epoch-convert",
      "get-minutes",
      [types.uint(time_stamp)],
      deployer.address
    );
    getSeconds = chain.callReadOnlyFn(
      "epoch-convert",
      "get-seconds",
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
    getMonths.result.expectAscii("March");
    getYears.result.expectUint(1972);
    getDays.result.expectUint(1);
    getHours.result.expectUint(0);
    getMinutes.result.expectUint(0);
    getSeconds.result.expectUint(0);
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
    let getYears = chain.callReadOnlyFn(
      "epoch-convert",
      "get-year",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getHours = chain.callReadOnlyFn(
      "epoch-convert",
      "get-hours",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getMinutes = chain.callReadOnlyFn(
      "epoch-convert",
      "get-minutes",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getSeconds = chain.callReadOnlyFn(
      "epoch-convert",
      "get-seconds",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays.result.expectAscii("Wednesday");
    getYears.result.expectUint(1973);
    getMonths.result.expectAscii("February");
    getDays.result.expectUint(28);
    getHours.expectUint(23);
    getMinutes.expectUint(59);
    getSeconds.expectUint(59);
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
    getYears = chain.callReadOnlyFn(
      "epoch-convert",
      "get-year",
      [types.uint(time_stamp)],
      deployer.address
    );
    getHours = chain.callReadOnlyFn(
      "epoch-convert",
      "get-hours",
      [types.uint(time_stamp)],
      deployer.address
    );
    getMinutes = chain.callReadOnlyFn(
      "epoch-convert",
      "get-minutes",
      [types.uint(time_stamp)],
      deployer.address
    );
    getSeconds = chain.callReadOnlyFn(
      "epoch-convert",
      "get-seconds",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays.result.expectAscii("Thursday");
    getYears.result.expectUint(1973);
    getMonths.result.expectAscii("March");
    getDays.result.expectUint(1);
    getHours.expectUint(0);
    getMinutes.expectUint(0);
    getSeconds.expectUint(0);
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
    let getYears = chain.callReadOnlyFn(
      "epoch-convert",
      "get-year",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getHours = chain.callReadOnlyFn(
      "epoch-convert",
      "get-hours",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getMinutes = chain.callReadOnlyFn(
      "epoch-convert",
      "get-minutes",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getSeconds = chain.callReadOnlyFn(
      "epoch-convert",
      "get-seconds",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays.result.expectAscii("Sunday");
    getMonths.result.expectAscii("December");
    getDays.result.expectUint(31);
    getHours.result.expectUint(23);
    getMinutes.result.expectUint(59);
    getSeconds.result.expectUint(59);
    getYears.result.expectUint(1972);
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
    getYears = chain.callReadOnlyFn(
      "epoch-convert",
      "get-year",
      [types.uint(time_stamp)],
      deployer.address
    );
    getHours = chain.callReadOnlyFn(
      "epoch-convert",
      "get-hours",
      [types.uint(time_stamp)],
      deployer.address
    );
    getMinutes = chain.callReadOnlyFn(
      "epoch-convert",
      "get-minutes",
      [types.uint(time_stamp)],
      deployer.address
    );
    getSeconds = chain.callReadOnlyFn(
      "epoch-convert",
      "get-seconds",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays.result.expectAscii("Monday");
    getMonths.result.expectAscii("January");
    getYears.result.expectUint(1973);
    getDays.result.expectUint(1);
    getHours.result.expectUint(0);
    getMinutes.result.expectUint(0);
    getSeconds.result.expectUint(0);
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
    let getHours = chain.callReadOnlyFn(
      "epoch-convert",
      "get-hours",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getMinutes = chain.callReadOnlyFn(
      "epoch-convert",
      "get-minutes",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getSeconds = chain.callReadOnlyFn(
      "epoch-convert",
      "get-seconds",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getWeekDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-week-days",
      [types.uint(time_stamp)],
      deployer.address
    );
    let getYears = chain.callReadOnlyFn(
      "epoch-convert",
      "get-year",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays.result.expectAscii("Monday");
    getMonths.result.expectAscii("December");
    getDays.result.expectUint(31);
    getHours.expectUint(23);
    getMinutes.expectUint(59);
    getSeconds.expectUint(59);
    getYears.result.expectUint(1973);
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
    getHours = chain.callReadOnlyFn(
      "epoch-convert",
      "get-hours",
      [types.uint(time_stamp)],
      deployer.address
    );
    getMinutes = chain.callReadOnlyFn(
      "epoch-convert",
      "get-minutes",
      [types.uint(time_stamp)],
      deployer.address
    );
    getSeconds = chain.callReadOnlyFn(
      "epoch-convert",
      "get-seconds",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays = chain.callReadOnlyFn(
      "epoch-convert",
      "get-week-days",
      [types.uint(time_stamp)],
      deployer.address
    );
    getYears = chain.callReadOnlyFn(
      "epoch-convert",
      "get-year",
      [types.uint(time_stamp)],
      deployer.address
    );
    getWeekDays.result.expectAscii("Tuesday");
    getMonths.result.expectAscii("January");
    getDays.result.expectUint(1);
    getHours.expectUint(0);
    getMinutes.expectUint(0);
    getSeconds.expectUint(0);
    getYears.result.expectUint(1974);
  },
});

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
      day: types.uint(20),
      hour: types.uint(15),
      minute: types.uint(40),
      month: types.ascii(months[3]), // it is the month of April according to the zero based indexing
      second: types.uint(38),
      week_day: types.ascii(weekDays[3]), // it is wednesday according to the index of the list provided on top
      year: types.uint(2022),
    });
    // this removes spaces between the tuple
    let a = readable.replace(/\s+/g, "");
    let b = humanReadable.result.replace(/\s+/g, "");
    assertEquals(a, b);
  },
});

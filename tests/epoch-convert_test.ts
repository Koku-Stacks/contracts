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
    let time_stamp = 68169599; // Monday, February 28, 1972 11:59:59 PM
    let humanReadable = chain.callReadOnlyFn(
      "epoch-convert",
      "human-readable",
      [types.uint(time_stamp)],
      deployer.address
    );
    humanReadable.result.expectTuple();
    let readable = types.tuple({
      day: types.uint(28),
      hour: types.uint(23),
      minute: types.uint(59),
      month: types.ascii(months[1]),
      second: types.uint(59),
      week_day: types.ascii(weekDays[1]),
      year: types.uint(1972),
    });
    // this removes spaces between the tuple
    let a = readable.replace(/\s+/g, "");
    let b = humanReadable.result.replace(/\s+/g, "");
    assertEquals(a, b);

    time_stamp++; // Tuesday, February 29, 1972 12:00:00 AM
    humanReadable = chain.callReadOnlyFn(
      "epoch-convert",
      "human-readable",
      [types.uint(time_stamp)],
      deployer.address
    );
    humanReadable.result.expectTuple();
    readable = types.tuple({
      day: types.uint(29),
      hour: types.uint(0),
      minute: types.uint(0),
      month: types.ascii(months[1]),
      second: types.uint(0),
      week_day: types.ascii(weekDays[2]),
      year: types.uint(1972),
    });
    // this removes spaces between the tuple
    a = readable.replace(/\s+/g, "");
    b = humanReadable.result.replace(/\s+/g, "");
    assertEquals(a, b);

    time_stamp = 68255999; // Tuesday, February 29, 1972 11:59:59 PM
    humanReadable = chain.callReadOnlyFn(
      "epoch-convert",
      "human-readable",
      [types.uint(time_stamp)],
      deployer.address
    );
    humanReadable.result.expectTuple();
    readable = types.tuple({
      day: types.uint(29),
      hour: types.uint(23),
      minute: types.uint(59),
      month: types.ascii(months[1]),
      second: types.uint(59),
      week_day: types.ascii(weekDays[2]),
      year: types.uint(1972),
    });
    // this removes spaces between the tuple
    a = readable.replace(/\s+/g, "");
    b = humanReadable.result.replace(/\s+/g, "");
    assertEquals(a, b);

    time_stamp++; // Wednesday, March 1, 1972 12:00:00 AM
    humanReadable = chain.callReadOnlyFn(
      "epoch-convert",
      "human-readable",
      [types.uint(time_stamp)],
      deployer.address
    );
    humanReadable.result.expectTuple();
    readable = types.tuple({
      day: types.uint(1),
      hour: types.uint(0),
      minute: types.uint(0),
      month: types.ascii(months[2]),
      second: types.uint(0),
      week_day: types.ascii(weekDays[3]),
      year: types.uint(1972),
    });
    // this removes spaces between the tuple
    a = readable.replace(/\s+/g, "");
    b = humanReadable.result.replace(/\s+/g, "");
    assertEquals(a, b);
  },
});

Clarinet.test({
  name: "Ensure that time-stamp values like 29th Feb land on 1st March on non-leap years!",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let time_stamp = 99791999; // Wednesday, February 28, 1973 11:59:59 PM
    let humanReadable = chain.callReadOnlyFn(
      "epoch-convert",
      "human-readable",
      [types.uint(time_stamp)],
      deployer.address
    );
    humanReadable.result.expectTuple();
    let readable = types.tuple({
      day: types.uint(28),
      hour: types.uint(23),
      minute: types.uint(59),
      month: types.ascii(months[1]),
      second: types.uint(59),
      week_day: types.ascii(weekDays[3]),
      year: types.uint(1973),
    });
    // this removes spaces between the tuple
    let a = readable.replace(/\s+/g, "");
    let b = humanReadable.result.replace(/\s+/g, "");
    assertEquals(a, b);

    time_stamp++; // Thursday, March 1, 1973 12:00:00 AM
    humanReadable = chain.callReadOnlyFn(
      "epoch-convert",
      "human-readable",
      [types.uint(time_stamp)],
      deployer.address
    );
    humanReadable.result.expectTuple();
    readable = types.tuple({
      day: types.uint(1),
      hour: types.uint(0),
      minute: types.uint(0),
      month: types.ascii(months[2]),
      second: types.uint(0),
      week_day: types.ascii(weekDays[4]),
      year: types.uint(1973),
    });
    // this removes spaces between the tuple
    a = readable.replace(/\s+/g, "");
    b = humanReadable.result.replace(/\s+/g, "");
    assertEquals(a, b);
  },
});

Clarinet.test({
  name: "Ensure that timestamp values land on days like 31-Dec and 01-Jan in leap years",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let time_stamp = 94694399; // Sunday, December 31, 1972 11:59:59 PM
    let humanReadable = chain.callReadOnlyFn(
      "epoch-convert",
      "human-readable",
      [types.uint(time_stamp)],
      deployer.address
    );
    humanReadable.result.expectTuple();
    let readable = types.tuple({
      day: types.uint(31),
      hour: types.uint(23),
      minute: types.uint(59),
      month: types.ascii(months[11]),
      second: types.uint(59),
      week_day: types.ascii(weekDays[0]),
      year: types.uint(1972),
    });
    // this removes spaces between the tuple
    let a = readable.replace(/\s+/g, "");
    let b = humanReadable.result.replace(/\s+/g, "");
    assertEquals(a, b);

    time_stamp++; // Monday, January 1, 1973 12:00:00 AM
    humanReadable = chain.callReadOnlyFn(
      "epoch-convert",
      "human-readable",
      [types.uint(time_stamp)],
      deployer.address
    );
    humanReadable.result.expectTuple();
    readable = types.tuple({
      day: types.uint(1),
      hour: types.uint(0),
      minute: types.uint(0),
      month: types.ascii(months[0]),
      second: types.uint(0),
      week_day: types.ascii(weekDays[1]),
      year: types.uint(1973),
    });
    // this removes spaces between the tuple
    a = readable.replace(/\s+/g, "");
    b = humanReadable.result.replace(/\s+/g, "");
    assertEquals(a, b);
  },
});

Clarinet.test({
  name: "Ensure that timestamp values land on days like 31-Dec and 01-Jan in non-leap years",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get("deployer")!;
    let time_stamp = 126230399; // Monday, December 31, 1973 11:59:59 PM
    let humanReadable = chain.callReadOnlyFn(
      "epoch-convert",
      "human-readable",
      [types.uint(time_stamp)],
      deployer.address
    );
    humanReadable.result.expectTuple();
    let readable = types.tuple({
      day: types.uint(31),
      hour: types.uint(23),
      minute: types.uint(59),
      month: types.ascii(months[11]),
      second: types.uint(59),
      week_day: types.ascii(weekDays[1]),
      year: types.uint(1973),
    });
    // this removes spaces between the tuple
    let a = readable.replace(/\s+/g, "");
    let b = humanReadable.result.replace(/\s+/g, "");
    assertEquals(a, b);

    time_stamp++; // Tuesday, January 1, 1974 12:00:00 AM
    humanReadable = chain.callReadOnlyFn(
      "epoch-convert",
      "human-readable",
      [types.uint(time_stamp)],
      deployer.address
    );
    humanReadable.result.expectTuple();
    readable = types.tuple({
      day: types.uint(1),
      hour: types.uint(0),
      minute: types.uint(0),
      month: types.ascii(months[0]),
      second: types.uint(0),
      week_day: types.ascii(weekDays[2]),
      year: types.uint(1974),
    });
    // this removes spaces between the tuple
    a = readable.replace(/\s+/g, "");
    b = humanReadable.result.replace(/\s+/g, "");
    assertEquals(a, b);
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

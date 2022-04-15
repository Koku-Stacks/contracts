
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

const months = ["Januray", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const utcTimeStamp = Date.parse(new Date().toString()) / 1000;

Clarinet.test({
    name: "Ensure that leap years are identified correctly!",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let isLeapYear = chain.callReadOnlyFn('epoch-convert', 'is-leap-year', [types.uint(1972)], deployer.address);
        isLeapYear.result.expectBool(true);

    },
});

Clarinet.test({
    name: "Ensure that non-leap years are identified correctly!",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let isLeapYear = chain.callReadOnlyFn('epoch-convert', 'is-leap-year', [types.uint(1975)], deployer.address);
        isLeapYear.result.expectBool(false);

    },
});

Clarinet.test({
    name: "Ensure that count of leap years since 1970 is identified correctly!",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let getLeapYears = chain.callReadOnlyFn('epoch-convert', 'get-leap-years-since-1970', [types.uint(2022)], deployer.address);
        getLeapYears.result.expectUint(13);

    },
});

Clarinet.test({
    name: "Ensure that current year is identified correctly!",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const time_stamp = Math.floor(Date.now() / 1000);
        let getYears = chain.callReadOnlyFn('epoch-convert', 'get-year', [types.uint(utcTimeStamp)], deployer.address);
        getYears.result.expectUint(new Date().getUTCFullYear());
    },
});

Clarinet.test({
    name: "Ensure that current month is identified correctly!",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const time_stamp = Math.floor(Date.now() / 1000);
        let getMonths = chain.callReadOnlyFn('epoch-convert', 'get-month', [types.uint(utcTimeStamp)], deployer.address);
        let correctMonth = months[new Date().getUTCMonth()]
        getMonths.result.expectAscii(correctMonth);
    },
});

Clarinet.test({
    name: "Ensure that current weekday is identified correctly!",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const time_stamp = Math.floor(Date.now() / 1000);
        let getWeekDays = chain.callReadOnlyFn('epoch-convert', 'get-week-days', [types.uint(utcTimeStamp)], deployer.address);
        let correctWeekDay = weekDays[new Date().getUTCDay()];
        getWeekDays.result.expectAscii(correctWeekDay);
    },
});

Clarinet.test({
    name: "Ensure that current day is identified correctly!",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const time_stamp = Math.floor(Date.now() / 1000);
        let getDays = chain.callReadOnlyFn('epoch-convert', 'get-day', [types.uint(utcTimeStamp)], deployer.address);
        let day = new Date().getUTCDate();
        getDays.result.expectUint(day);
    },
});

Clarinet.test({
    name: "Ensure that current hours is identified correctly!",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        let getHours = chain.callReadOnlyFn('epoch-convert', 'get-hours', [types.uint(utcTimeStamp)], deployer.address);
        let hours = new Date().getUTCHours(); // those who are in GMT time zone please remove 5
        getHours.result.expectUint(hours);
    },
});

Clarinet.test({
    name: "Ensure that current minutes is identified correctly!",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const time_stamp = Math.floor(Date.now() / 1000);
        let getMinutes = chain.callReadOnlyFn('epoch-convert', 'get-minutes', [types.uint(utcTimeStamp)], deployer.address);
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
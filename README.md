# spain-consulate-appointments

Basic script that automatically checks for availability of appointments for the Spanish consulate in Santiago, Chile and notifies user if anything is found

## Status of the project
This is not a scalble/maintainable solution since it has been built in a very short time-frame. It is for personal use only! I won't respond to any issues and don't expect any support.

## Environment

Linux/MacOS + NodeJS 20

## Install dependencies

Run the command
```bash
npm install
```

## Run the script
The script runs once and exits after being triggered. You want to write your own wrapper arround it or use a scheduler to trigger it.

```bash
node index.js
```

To run in production, set `NODE_ENV` to production, or just to run it once do
```bash
NODE_END=production node index.js
```


## Push Over

I'm using push over for notification

[Pushover](https://pushover.net/) is a service that enables to easily send Push Notifications to devices, I like it because by paying just once in a lifetime ($4.99 USD as of 2024) I get 10k free push notifications a month per project, more than enough for my personal needs. After installing the App on your smartphone, you need to set the following enviroment variables

```
PUSHOVER_APP_TOKEN=<App key>
PUSHOVER_USER_KEY=<User or Group key>
```


## Render

This app is being run on render.com.

There's a known issue where the cache used by puppeteer is not found, `puppeteer.config.cjs` is a workaround where we reset the cache. On render.com you also need to set `PUPPETEER_CACHE_DIR=/opt/render/project/puppeteer` and make your run command `./render-build.sh`

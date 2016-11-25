# RN Web Bot
## Setting Up
First, clone the repository:

    git clone https://github.com/mingtsay/rn-web-bot.git

Now enter into the repository's folder and install dependencies:

    cd rn-web-bot
    npm install

You'll have to setup your Telegtram bot's API token in `bot_token.js`. You can copy `bot_token.example.js` and change to your token.

After you setup your bot's token, use the following command to run the server:

    node server

## Usage
### /board `<Action>` `<DeviceId>`
Board command can fetch the status of a board. You will also use this command to connect to a board.
#### Action: `set`
Connect to the specified board.
#### Action: `status`
Fetch the status of the specified board.

### /io `<Pin>` `<Action>` `[Timeout]`
Perform an action on the specified pin.
#### Action: `on`, `off`, `toggle`
Setting the pin to the specified state.
#### Action: `get`
Getting the state of the specified pin.
#### Timeout
You can set the timeout in second or in datetime in order to schedule your action.
For example, you can call `/io 13 off 30` to turn off the LED after 30 seconds.
Call `/io 13 get 12:30` to get the state of the LED on 12:30 today.
And call `/io 13 toggle 2016/12/31 12:34:56` to toggle the LED at the specified datetime.

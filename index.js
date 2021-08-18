require("dotenv").config();
const ws = require('ws'),
	os = require ("os"),
	{ token } = process.env,
	{ execSync } = require("child_process");
let dws = new ws('wss://gateway.discord.gg/?v=7&encoding=json'), interval, statusInterval, session_id=0, seq=0, isPonged, isResume, mfn, efn, identifyStr = JSON.stringify({
	  op: 2,
	 d: {
    token: token,
    intents: 0,
    properties: {
      $os: process.platform,
      $browser: "Discord Android",
      $device: os.type()
    		},
    		presence: {
    			activities: [{
						type: 0,
						name: "Termux: Linux terminal environment for Android",
						state: `${execSync("printf $(cat ~/.sessions)")} session(s)`
    			}],
    			status:"dnd",
    			afk:false
    		},
    		compress:false
			}
		});
mfn = dws.onmessage = ({data}) => {
const json = JSON.parse(data);
if(json.s) seq = json.s;
switch(json.op){
		case 10:
		console.log("Debug: 10 Hello");
		reconnect = true;
		interval = setInterval(()=> {
					console.log("Debug: 1 Ping");
					dws.send(JSON.stringify({op:1,d: seq}));
					isPonged = false;
			},json.d.heartbeat_interval);
		
		if(!isResume){
			console.log("Debug: 2 IDENTIFY");
			dws.send(identifyStr);
			isResume = true;
		} else {
			console.log("Debug: 6 started RESUME");
			dws.send(JSON.stringify({
	 		op:6,
	 		d:{
				token,
				session_id,
				seq
			}
			}));
		}
		break;
		case 1:
			if(!isPonged) dws.close(4001);
			console.log("Debug: 1 Pinged");
			dws.send(pingstr);
			isPonged = false;
			break;
		case 9:
			console.log("Error: 9 invalid session");
			dws.close(4001);
			break;
		case 7:
			console.log("Debug: 7 Reconnection");
			dws.close(4001);
			break;
		case 11:
			console.log("Debug: 11 Ponged");
			seq = json.d;
			isPonged = true;
	}
	if(!json.t) return;
	switch(json.t){
	case "READY":
	session_id = json.d.session_id;
	console.log(session_id, seq);
	console.log(`client ready on ${json.d.user.username}#${json.d.user.discriminator}`);
	statusInterval = setInterval(()=>{
			dws.send(JSON.stringify({
				op:3,
				d:{
					activities: [{
						type: 0,
						name: "Termux: Linux terminal environment for Android",
						state: `${execSync("printf $(cat ~/.sessions)")} session(s)`,
						application_id: "765223157065711616"
    			}],
    			status:"dnd",
    			afk:false,
    			since:null
				}
			}));
			console.log("Debug: status updated");
		},20000);
	break;
	case "RESUMED":
		console.log("Debug: 6 ended RESUME");
}
	
};
efn = dws.onclose = dws.onerror = ({code, reason, error}) => {
	console.log(`Closed: ${error||code+' '+reason}`);
	clearInterval(interval);
	clearInterval(statusInterval);
	dws = new ws('wss://gateway.discord.gg/?v=7&encoding=json');
	dws.onclose = dws.onerror = efn;
	dws.onmessage = mfn;
};

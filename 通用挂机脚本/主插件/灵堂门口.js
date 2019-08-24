var Async = require('async');
var supplyMode = require('./../公共模块/灵堂回补');
var teamMode = require('./../公共模块/组队模式');
var logbackEx = require('./../公共模块/登出防卡住');

var cga = global.cga;
var configTable = global.configTable;

var interrupt = require('./../公共模块/interrupt');

var moveThinkInterrupt = new interrupt();
var playerThinkInterrupt = new interrupt();
var playerThinkRunning = false;

var moveThink = (arg)=>{

	if(moveThinkInterrupt.hasInterrupt())
		return false;

	if(arg == 'freqMoveMapChanged')
	{
		playerThinkInterrupt.requestInterrupt();
		return false;
	}

	return true;
}

var playerThink = ()=>{

	if(!cga.isInNormalState())
		return true;
	
	var playerinfo = cga.GetPlayerInfo();
	var ctx = {
		playerinfo : playerinfo,
		petinfo : playerinfo.petid >= 0 ? cga.GetPetInfo(playerinfo.petid) : null,
		teamplayers : cga.getTeamPlayers(),
		result : null,
		dangerlevel : thisobj.getDangerLevel(),
	}

	teamMode.think(ctx);

	global.callSubPlugins('think', ctx);

	if(cga.isTeamLeaderEx())
	{
		if(ctx.result == null && playerThinkInterrupt.hasInterrupt())
			ctx.result = 'supply';

		if(ctx.result == 'supply' && supplyMode.isLogBack())
			ctx.result = 'logback';
		
		if( ctx.result == 'supply' )
		{
			moveThinkInterrupt.requestInterrupt(()=>{
				if(cga.isInNormalState()){
					supplyMode.func(loop);
					return true;
				}
				return false;
			});
			return false;
		}
		else if( ctx.result == 'logback' )
		{
			moveThinkInterrupt.requestInterrupt(()=>{
				if(cga.isInNormalState()){
					logbackEx.func(loop);
					return true;
				}
				return false;
			});
			return false;
		}
	}

	return true;
}

var playerThinkTimer = ()=>{
	if(playerThinkRunning){
		if(!playerThink()){
			console.log('playerThink off');
			playerThinkRunning = false;
		}
	}
	
	setTimeout(playerThinkTimer, 1500);
}

var loop = ()=>{

	var map = cga.GetMapName();
	var mapindex = cga.GetMapIndex().index3;
	var xy = cga.GetMapXY();
	var isleader = cga.isTeamLeaderEx();

	if(isleader && teamMode.is_enough_teammates()){
		if(map == '灵堂')
		{
			console.log('playerThink on');
			playerThinkRunning = true;
			
			cga.freqMove(0);
			return;
		}
		if(map == '艾尔莎岛')
		{
			console.log('playerThink on');
			playerThinkRunning = true;
			
			cga.travel.falan.toStone('C', ()=>{
				cga.walkList([
					[47, 85, '召唤之间'],
					[27, 8, '回廊'],
					[23, 19, '灵堂'],
					[30, 49],
				], ()=>{
					cga.freqMove(0);
				});
			});
			return;
		}
		if(map == '回廊')
		{
			console.log('playerThink on');
			playerThinkRunning = true;
			
			cga.walkList([
				[23, 19, '灵堂'],
				[30, 49],
			], ()=>{
				cga.freqMove(4);
			});
			return;
		}
	} else if(!isleader){
		console.log('playerThink on');
		playerThinkRunning = true;
		return;
	}

	if(cga.needSupplyInitial() && supplyMode.isInitialSupply())
	{
		supplyMode.func(loop);
		return;
	}
	
	callSubPluginsAsync('prepare', ()=>{
		cga.travel.newisland.toStone('X', ()=>{
			cga.walkList([
			cga.isTeamLeader ? [144, 106] : [143, 106],
			], ()=>{
				teamMode.wait_for_teammates(loop);
			});
		});
	});
}

var thisobj = {
	getDangerLevel : ()=>{
		var map = cga.GetMapName();

		if(map == '灵堂')
			return 1;
		
		return 0;
	},
	translate : (pair)=>{

		if(supplyMode.translate(pair))
			return true;
		
		if(teamMode.translate(pair))
			return true;
		
		return false;
	},
	loadconfig : (obj)=>{

		if(!supplyMode.loadconfig(obj))
			return false;

		if(!teamMode.loadconfig(obj))
			return false;
		
		return true;
	},
	inputcb : (cb)=>{
		Async.series([supplyMode.inputcb, teamMode.inputcb], cb);
	},
	execute : ()=>{
		playerThinkTimer();
		cga.registerMoveThink(moveThink);
		callSubPlugins('init');
		logbackEx.init();
		loop();
	},
}

module.exports = thisobj;
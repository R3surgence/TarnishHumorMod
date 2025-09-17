//heyyyy welcome to the public branch
//this is like. all the finished stuff and shit (hence why it has public in the name because its meant for the public)

document.addEventListener('corru_entered', () => {
//windup shit for augmentsss
    CrittaMenu.generateStatHTMLObject = function(stats, {member, slotName, componentName, editingMember = {}} = {}) {
        let returnStats = {
            core: "",
            in: "",
            out: ""
        }
    
        let component = false
        if(componentName) component = env.COMBAT_COMPONENTS[componentName][slotName]
    
        //if a specific component is specified, we can also get a list of perma/auto statuses from it
        if(component?.alterations || member?.components) {
            function addStatusLine(statusObj) {
                returnStats.core += `
                    <div class="stat status" 
                        type="status" 
                        pretty="${statusObj.name}"
                        definition="${statusObj.impulse ? `IMPULSE::` : 'PASSIVE::'}'${statusObj.name}'\nEFFECT::${processHelp(statusObj, {caps: true})}"
                        good="${statusObj.beneficial ? String(statusObj.beneficial).replace("true", "good") : "bad"}"
                    >+ ${statusObj.name}</div>
                `
            }
    
            function addActionLine(actionObj, override = "ADD") {
                let effectiveOverride = override
                switch(effectiveOverride) {
                    case "ADD": break
                    case "ADD WINDUP": break
                    default:
                        effectiveOverride = env.ACTIONS[override].name
                }
    
                returnStats.core += `
                    <div class="stat action" 
                        type="action"
                        override="${effectiveOverride}"
                        definition="ACTION++${actionObj.slug}"
                    >${actionObj.name}</div>
                `
            }
    
            //for components, we also compile any used augments to display the proper end effect
            if(component?.alterations) {
                let effectiveAlterations = [... component.alterations]
    
                //get all augments that...
                    // that AREN'T in pending remove AND are currently in use
                    // are in the pending add
                let effectiveAugments = []
                if(editingMember.augments) effectiveAugments = effectiveAugments.concat(editingMember.augments)
                if(editingMember.augmentChanges) {
                    effectiveAugments = effectiveAugments.concat(editingMember.augmentChanges.add)
                    effectiveAugments = effectiveAugments.filter(aug => !editingMember.augmentChanges.remove.includes(aug))
                }
    
                //combine the gathered augments with the effective alterations
                //filter down to just those for this specific component and slot
                for (const augmentSlug of effectiveAugments) {
                    const augment = env.ACTOR_AUGMENTS.generic[augmentSlug]
                    if(augment.component[0] == slotName && augment.component[1] == componentName) effectiveAlterations = effectiveAlterations.concat(augment.alterations)
                }
    
                console.log('effective augments are', effectiveAugments, 'alts are', effectiveAlterations)
                for (const alteration of effectiveAlterations) {
                    if(alteration[0] == "STATUS") addStatusLine(env.STATUS_EFFECTS[alteration[1]]);
                    else switch(alteration[0]) {
                        case "ADD":
                            addActionLine(env.ACTIONS[alteration[1]])
                        break
                        
                        default:
                            addActionLine(env.ACTIONS[alteration[1]], alteration[0])
                    }
                }
    
            //otherwise, if a member is specified, we can get their collective statuses that way
            } else if(member?.components || member?.alterations || member?.augments) {
                for (const statusObj of getPassiveStatusesForPartyMember(member)) {
                    addStatusLine(statusObj)
                }
            }
        }
    
        for (const statName in stats) {
            const statInfo = env.STATDATA[statName]
    
            if(statInfo) {
                var statValue = stats[statName]
                let goodClass = false
    
                //we show all HP if a member is specified
                if(statName == "maxhp" && member) {
                    statValue += env.COMBAT_ACTORS[member.combatActor].maxhp
                }
    
                if(statValue > 0) {
                    switch(statInfo.good) {
                        case "+":
                            goodClass = "good"
                        break
                        case "-":
                            goodClass = "bad"
                        break
                    }
                } else if (statValue < 0) {
                    switch(statInfo.good) {
                        case "+":
                            goodClass = "bad"
                        break
                        case "-":
                            goodClass = "good"
                        break
                    }
                }
                
                let list = "core"
                if(statName.includes("incoming")) list = "in"
                else if(statName.includes("outgoing")) list = "out"
    
                returnStats[list] += `
                    <div class="stat ${statName.includes("outgoing") ? "outgoing" : ""} ${statName.includes("incoming") ? "incoming" : ""}" 
                        type="${statName}" 
                        pretty="${statInfo ? statInfo.display : statName}"
                        definition="INFO::${statInfo ? statInfo.description : "'not found'"}"
                        ${goodClass ? `good=${goodClass}` : ""}
                    >${statValue > 0 && statName != "maxhp" ? "+" : ""}${statInfo.percentage ?
                        `${statValue * 100}%`
                        :
                        statValue
                    }</div>
                `
            }
        }
    
        returnStats.all = returnStats.core + returnStats.in + returnStats.out
        if(returnStats.all == "") return false
        return returnStats
    },    

    function midCombatAllyRemove(actor) {
        env.rpg.allyTeam.members = env.rpg.allyTeam.members.filter(a => a.slug != actor.slug)
        delete env.rpg.actors[actor.slug]
    
        content.querySelectorAll(`#ally-team #${actor.slug}`).forEach(el=>{
            el.classList.add('phasing')
            setTimeout(()=>{
                el.remove()
            }, 1000)
        })
    
        //update the turnorder
        env.rpg.turnOrder = []
        env.rpg.teams.forEach((team, i) => {
            env.rpg.turnOrder = env.rpg.turnOrder.concat(team.members);
        })
    
        updateStats()
    }
    
    function midCombatAllyAdd(actorSpecifier, side = "right") {
        if(!env.rpg.active) return false;
        
        let actor = initializeActor(actorSpecifier, {team: env.rpg.allyTeam, enemyTeam: env.rpg.enemyTeam, uniqify: true, side})
        
        if(env.rpg.settings.actorPreprocess) env.rpg.settings.actorPreprocess(actor)
        if(actor.base?.events?.onInitialize) actor.base.events.onInitialize(actor)
        if(actor.alterations || env.rpg.settings.teamAlterations?.enemy || env.rpg.settings.teamAlterations?.all ) actor.actions = getAlteredActorActions({member: actor, actor: actor})
    
        initializeActorUI({actor, team: env.rpg.allyTeam, side, animateIn: true})
    
        //update the turnorder
        env.rpg.turnOrder = []
        env.rpg.teams.forEach((team, i) => {
            env.rpg.turnOrder = env.rpg.turnOrder.concat(team.members);
        })
    
        updateStats()
        return actor
    }

    env.STATUS_EFFECTS.ally_ethereal = {
        slug: "ally_ethereal",
        name: "Ethereal",
        help: "disappear on death",
        infinite: true,
        events: {
            onDeath: function() {
                setTimeout(()=>midCombatAllyRemove(this.status.affecting), 600)
            },
        }
    },
    
    content.insertAdjacentHTML('beforeend', `<style>
/* for making player cards not overflow offscreen */
.team {
    display: flex;
    width: 100%;
    justify-content: center;
    position: absolute;
    transition: 400ms cubic-bezier(.55,0,.39,1.26);
    z-index: 30;
    flex-wrap: wrap;
}</style>`);
    
/* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    yoy are now entering THE HUMOR AND SHIT ZONEEE
    
There are 3 "paths" in Tarnish Humor:

"True Self" is basically like. staying true to the path of tarnish

"Astray" is like going a bit astray (name drop) from the path and start using some statuses

"Velzies Servant" is the ULTIMATE path, it uses both raw damage and statuses and shit but you must have all 3 of the servant impulses for those actions to actually work and be powerful, otherwise if you try to use them without the impulses they do nothing or the bare minimum*/
    
    env.COMBAT_COMPONENTS.truedmg = {
    name: "Tarnish",
    slug: "truedmg",
    description: "'emotion nullification';'heavyweight champion';'the legend of the servant'",
    help: "'raw damage';'status nullification';'incoming damage reduced';'BECOME VELZIES SERVANT'",

    primary: {
        alterations: [["primary", "truedmg_hit"]],
        stats: {
            maxhp: 5
        },
    },

    secondary: {
        alterations: [["secondary", "truedmg_block"]],
        stats: {
            maxhp: 10
        },
    },

    utility: {
        alterations: [["evade", "truedmg_surge"]], 
        stats: {
            maxhp: 5
        },
    },
    combatModifiers: ["truedmg_nullification", "truedmg_entropy", "truedmg_skin", "truedmg_servant_primary", "truedmg_servant_secondary", "truedmg_servant_evade"]
},

env.ACTOR_AUGMENTS.generic.truedmg_hardhitaug = {
    slug: "truedmg_hardhitaug",
    name: "True Self: Harder Hits",
    image: "/img/sprites/combat/augs/ultraspy.gif",
    description: "'more focused and heavier punches';'able to pierce through BP and any other defenses';'cant be used with other primary augments that change actions'",
    alterations: [
        ["truedmg_hit", "truedmg_hardhit"],
    ],
    component: ["primary", "truedmg"],
    cost: 2
},

env.ACTOR_AUGMENTS.generic.truedmg_clawaug = {
    slug: "truedmg_clawaug",
    name: "Astray: Elemental Claw",
    image: "/img/sprites/combat/augs/sacrifice.gif",
    description: "'start clawing at enemy';'inflict random negative status on selected actor';'cant be used with other primary augments that change actions'",
    alterations: [
        ["truedmg_hit", "truedmg_claw"],
    ],
    component: ["primary", "truedmg"],
    cost: 2
},

env.ACTOR_AUGMENTS.generic.truedmg_servantaug1 = {
    slug: "truedmg_servantaug1",
    name: "Velzies Servant: Calm Before The Storm",
    image: "/img/sprites/combat/augs/barrier.gif",
    description: "'unleash a frightening storm of attacks upon the whole opposing team';'requires the 3 impulses to truly activate';'able to pierce through BP and any other defenses';'cant be used with other primary augments that change actions'",
    alterations: [
        ["truedmg_hit", "truedmg_servantstormcheck"],
    ],
    component: ["primary", "truedmg"],
    cost: 4
},

env.ACTOR_AUGMENTS.generic.truedmg_retaliationaug = {
    slug: "truedmg_retaliationaug",
    name: "True Self: Retaliation",
    image: "/img/sprites/combat/augs/cripple.gif",
    description: "'retaliate against hostile foes';'let them hit you';'cant be used with other secondary augments that change actions'",
    alterations: [
        ["truedmg_block", "truedmg_retaliation"],
    ],
    component: ["secondary", "truedmg"],
    cost: 2
},

env.ACTOR_AUGMENTS.generic.truedmg_callaug = {
    slug: "truedmg_callaug",
    name: "Astray: Elemental Call",
    image: "/img/sprites/combat/augs/countercall.gif",
    description: "'call upon the elements';'inflict random positive status onto self';'chance to summon elemental allies';'cant be used with other secondary augments that change actions'",
    alterations: [
        ["truedmg_block", "truedmg_call"],
    ],
    component: ["secondary", "truedmg"],
    cost: 3
},

env.ACTOR_AUGMENTS.generic.truedmg_servantaug2 = {
    slug: "truedmg_servantaug2",
    name: "Velzies Servant: The Great Elemental Burst",
    image: "/img/sprites/combat/augs/bstrd.gif",
    description: "'summon powerful elemental allies';'inflict 2T of all elements on whole opposing team';'cant be used with other secondary augments that change actions'",
    alterations: [
        ["truedmg_block", "truedmg_servantelementalcheck"],
    ],
    component: ["secondary", "truedmg"],
    cost: 4
},

env.ACTOR_AUGMENTS.generic.truedmg_overclock = {
    slug: "truedmg_overclock",
    name: "True Self: Overclock",
    image: "/img/sprites/combat/augs/optimize.gif",
    description: "'create something beyond surge';'overclock action for extreme damage but damage and stun yourself in the process';'cant be used with other evade augments that change actions'",
    alterations: [
        ["truedmg_surge", "truedmg_overclock"],
    ],
    component: ["evade", "truedmg"],
    cost: 2
},

env.ACTOR_AUGMENTS.generic.truedmg_consumeaug = {
    slug: "truedmg_consumeaug",
    name: "Astray: Elemental Consume",
    image: "/img/sprites/combat/augs/parasite.gif",
    description: "'consume all elemental statuses';'recieve great buffs in return';'cant be used with other evade augments that change actions'",
    alterations: [
        ["truedmg_surge", "truedmg_consume"],
    ],
    component: ["secondary", "truedmg"],
    cost: 4
},

env.ACTOR_AUGMENTS.generic.truedmg_servantaug3 = {
    slug: "truedmg_servantaug3",
    name: "Velzies Servant: Raging Echoes Of The Past",
    image: "/img/sprites/combat/augs/distract.gif",
    description: "'cause chaos, mass hysteria, and fear on everyone';'cant be used with other evade augments that change actions'",
    alterations: [
        ["truedmg_surge", "truedmg_servantechocheck"],
    ],
    component: ["secondary", "truedmg"],
    cost: 4
},

env.COMBAT_ACTORS.generic.reactionPersonalities.truedmg = { //fiiilllledddd
    evade: ["not this time", "nope", "nada", "nuh uh"],
    crit: ["feel my wr@th", "wither away", "ashes to ashes"],
    hit: ["could've been better", "it'll do", "meh"],
    crit_buff: ["here you go", "feels good, doesn't it?", "say thank you"],
    miss: ["could've been worse", "oh well", "how dare you deprieve me of blood"],
    dead: ["..."],
    puncture: ["it burns", "that stings", "owwow"],
    regen: ["feeling good", "oh yes", "goood"],
    destabilized: ["ohauuhhaoo", "ohhhuuua", "aaaaauuhaoo"],
    stun: ["tired", "aw cmon", "how dare you", "hhughhhuuuhhh", "ggghhhhh"],
    laugh: ["ahahah", "ahehehehe", "ehahahaha", "ehehehehe", "eheheha", "ahahahahe"],
    give_echo: ["cower from the tr%u^th", "h1de fr0m it", "r^n"], //for servant "evade"
    give_storm: ["di3", "the st0rm i$ c0m1ng", "h!de"], //for servant primary
    give_ice: ["freeze!", "die a cold death", "you will freeze"],
    give_fire: ["burn!", "may you suffer in the flames", "turn to ashes"],
    give_wind: ["become blown away", "the air shall envelop you", "choke and struggle"],
    give_ground: ["become bound", "you will become one", "wither and struggle"],
    give_elemental: ["you will become one with the elements", "burn, choke, freeze, struggle!", "c0wer"], //for servant secondary
    receive_crit: ["owwowoowowwww", "that hurts a lot", "damn it", "yeeeowchh"],
    receive_ice2: ["the cold", "i feel cold"],
    receive_fire2: ["the ashes", "i feel warm"],
    receive_wind2: ["the air", "i feel light"],
    receive_consumed: ["i feel stronger", "consumed", "yummy", "thats a spicy meataball", "crunchy ice", "absorbed the blessings"], //for astray consume
    receive_ground2: ["the ground", "i feel heavy"],
    receive_overclock: ["ooh yeahh", "you will return to sludge", "if velzie didnt want me doing this, then why can i do it?", "prepare yourself"],
    receive_puncture: ["qounded", "it burns", "thats unfortunate", "oh well"],
    receive_regen: ["oh thank yoou"],
    receive_destabilized: ["ugaihohuhuoo", "oughihghhhh", "oouhhuhhuuoooihgg"],
    receive_rez: ["i will not be deprived of battle", "i awaken once more"],
    receive_carapace: ["tough", "as the bright cousins say, 'tuff'!", "nice"],
    receive_fear: ["freamkinhg scarry", "fearing", "spoookyy"],
    receive_redirection: ["and deprive me of battle?", "i dont think so", "how dare you"]
}

//to be continued...

})

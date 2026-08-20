Don't modify or create anything just yet. I have a larger project and want to collaborate on a plan before I say get started.

I have a demo story in ruleprod that I need to tell, which is basically this:

# environment
pagerduty account (created, empty)
slack workspace (created, empty)
slack app / bot (not created)
long-running incident-manager service (not created, called bridge in the spec)
aura web-server running and configured with
  - llm credentials
  - mcps
    - grafana
    - pagerduty (not created)

# demo flow
- pagerduty incident created
- pagerduty automations run:
  - dedicated slack incident channel created
  - incident summary posted
  - one liner posted to #incidents (not created in the demo slack workspace yet) with a link to the new slack channel
  - webhook sent to bridge with incident id and slack channel id
- bridge receives webhook and
  - posts a message to the dedicated incident channel with the slackbot, content is "AURA is investigating"
  - prompts aura to investigate the incident with id
  - routinely updates the message on slack thread with relevant status updates
  - posts the full response from aura when aura is done
- human replies in thread or incident channel to aura's message and tags the slackbot, asking for more detail
  - bridge resumes the investigatation with the new prompt and the loop happens again
    - bridge posts a message to the slack thread or channel with the slackbot, content is "AURA is investigating"
    - loop continues as before
- human replies again and asks for something requiring a change
  - bridge resumes investigation, and posts appropriately, and eventually change triggers aura hitl
  - bridge adds a new message (again in either the thread where the request happened, or the incident channel) with a message with approve/deny buttons

# some important things
- hitl approval/deny slack messages can land in a thread if resulting from a thread, but slack's "also post to #<containing channel>" should be toggled for these messages
- tagging aura outside of an incident channel - disable that for now
- stub out approval/deny permissions - allow any slack user to do this now, but have the mechanism in place to deny this (either using slack conventions, or gated on the bridge)

# things to figure out
- forking: how to handle this scenario:
  1. initial aura response as message in dedicated incident channel
  2. human 1 tags slackbot with 1st followup question in a new message in the dedicated incident channel (resumes aura investigation context)
  3. human 2 tags slackbot with 2nd followup question in a new message in the dedicated incident channel (resumes aura investigation context again)
  4. human 3 replies to 1st followup question in thread, with a 3rd followup question, relevant to the 1st followup answer (do we resume from latest context, do we store state and fork from first investigation context, do we summarize other followups and prepend their message?)
- overlapping aura requests: imagine in the scenario above, step 3 happened before step 2 finished
- how bridge talks to aura. we have options for completions api, a2a api, or invoking the cli with native --resume functionality
- how hitl works: hitl can use webhooks (aura talks back to bridge?) or I believe there are (sse?) events we can lean on with completions api or a2a (confirm)

# organization
before you get started building, you need to look at the repos to get familiar with how things are setup, and we need to collab onsome requirements on staying organized.
- give me suggestions on where the bridge code lives
- i prefer to manage pagerduty config, slack config, (and other configs later on like datadog, grafana, mezmo), programmatically, with terraform if possible
  - most of this config will be long-lived, but in some cases i may have a demo scenario that requires creating temporary config on some of these providers (like a grafana dashboard) which should be defined in a demo-scenarios directory, but it may depend on the "long-lived" config code/state/framework/etc.
- clean separation between triggers (pagerduty, slackbot getting tagged, etc), routing / control logic, aura connection, and outbound requests like slack api
  - this will make it easy to test things like sending a message to slack without having to invoke aura, or receiving a pagerduty webhook without having to actually create an incident
    - on the note of testing, building a simulated "aura connector" would be great if its a standalone file and we can configure the bridge to use it
      - it should do all the same things as aura (receive a prompt, go through a few "thinking" steps that we can use to exercise the status updates going to slack, and also generate a session_id / support resuming, but just use random filler text instead of llm generated responses)
    - in fact, a tui for the bridge will be great, being able to toggle aura off (and a built-in simulated aura) will save a lot of tokens, but also sending test messages / approval requests to slack will help with testing and formatting. triggering fake pd incidents would be nice too but without a channel to post to (remember pd creates the channel), i don't want to have to deal with the code getting too big. i'd rather just trigger an investigation in PD here.
- how to document this efficiently and concisely

# the steps I believe need to happen in order (feel free to correct these)

once we have a final plan / spec, your final output will be my instructions, which should look similar to this:
1. TF: create slack app phase 1 (no events) → signing secret out → put in secret store
2. Manual: install app (one click) → bot token → secret store
3. Manual: acquire PD account admin key
4. Manual: configure PD Slack extension; capture the channel naming pattern
5. TF: configure PD service + Events v2 integration → routing key
6. Manual + claude: Create bridge service, repo if required
7. Manual: Create ECR repo
8. Manual: push to github to deploy service. TBD if we also have terramate changes, or if we are keeping this stuff separate from terramate for the demo env
9. TF: Slack app phase 2 (event_subscriptions — challenge passes now)
10. TF or script: PD v3 webhook subscription → capture secret → update k8s secret → roll pod
11. Testing
/*
 * This is the view used internally by the panel that displays overflow events in the
 * month view. Anytime a day cell cannot display all of its events, it automatically displays
 * a link at the bottom to view all events for that day. When clicked, a panel pops up that
 * uses this view to display the events for that day.
 */
Ext.define('Sonicle.calendar.view.MonthDayDetail', {
    extend: 'Ext.Component',
    alias: 'widget.monthdaydetailview',

    requires: [
        'Ext.XTemplate',
        'Sonicle.Date',
        'Sonicle.calendar.view.AbstractCalendar'
    ],

    afterRender: function() {
        this.tpl = this.getTemplate();

        this.callParent(arguments);

        this.el.on({
			mouseover: this.view.onMouseOver,
            mouseout: this.view.onMouseOut,
            dblclick: this.view.onClick,
			//TODO: valutare se abilitare il menu contestuale
			//contextmenu: this.view.onContextMenu,
            scope: this.view
        });
    },

    getTemplate: function() {
        if (!this.tpl) {
            this.tpl = new Ext.XTemplate(
                '<div class="ext-cal-mdv x-unselectable">',
                    '<table class="ext-cal-mvd-tbl" cellpadding="0" cellspacing="0">',
                        '<tbody>',
                            '<tpl for=".">',
                                '<tr><td class="ext-cal-ev">{markup}</td></tr>',
                            '</tpl>',
                        '</tbody>',
                    '</table>',
                '</div>'
            );
        }
        this.tpl.compile();
        return this.tpl;
    },

    update: function(dt) {
        this.date = dt;
        this.refresh();
    },

    refresh: function() {
        if (!this.rendered) return;
        var me = this,
				XDate = Ext.Date,
				SoDate = Sonicle.Date,
				EM = Sonicle.calendar.data.EventMappings,
				eventTpl = me.view.getEventTemplate(),

        templateData = [],

        evts = me.store.queryBy(function(rec) {
            var thisDt = XDate.clearTime(me.date, true).getTime(),
                recStart = XDate.clearTime(rec.data[EM.StartDate.name], true).getTime(),
				recEnd = XDate.clearTime(rec.data[EM.EndDate.name], true).getTime(),
				isAllDay = (rec.data[EM.IsAllDay.name] === true),
                startsOnDate = (thisDt === recStart),
				endsOnDate = (thisDt === recEnd),
                spansDate = false;
			
			if(this.view.isHeaderView) {
				// Skip events that are already displayed on hours view
				if(startsOnDate && endsOnDate && !isAllDay) return false;
			}
			
            if (!startsOnDate) {
                var recEnd = XDate.clearTime(rec.data[EM.EndDate.name], true).getTime();
                spansDate = recStart < thisDt && recEnd >= thisDt;
            }
            return startsOnDate || spansDate;
        },
        me);

        evts.each(function(evt) {
            var item = evt.data;

            item._renderAsAllDay = item[EM.IsAllDay.name] || SoDate.diffDays(item[EM.StartDate.name], item[EM.EndDate.name]) > 0;
            item.spanLeft = SoDate.diffDays(item[EM.StartDate.name], me.date) > 0;
            item.spanRight = SoDate.diffDays(me.date, item[EM.EndDate.name]) > 0;
            item._spanCls = (item.spanLeft ? (item.spanRight ? 'ext-cal-ev-spanboth':
            'ext-cal-ev-spanleft') : (item.spanRight ? 'ext-cal-ev-spanright': ''));

            templateData.push({
                markup: eventTpl.apply(me.getTemplateEventData(item))
            });
        },
        me);

        me.tpl.overwrite(me.el, templateData);
        me.fireEvent('eventsrendered', me, me.date, evts.getCount());
    },

    getTemplateEventData: function(evt) {
        var data = this.view.getTemplateEventData(evt);
        data._elId = 'dtl-' + data._elId;
        return data;
    }
});

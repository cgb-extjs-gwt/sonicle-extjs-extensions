/*
 * Internal drop zone implementation for the calendar components. This provides base functionality
 * and is primarily for the month view -- DayViewDD adds day/week view-specific functionality.
 */
Ext.define('Sonicle.calendar.dd.DropZone', {
    extend: 'Ext.dd.DropZone',
    
    requires: [
        'Sonicle.Date',
        'Sonicle.calendar.data.EventMappings'
    ],

    ddGroup: 'CalendarDD',
    eventSelector: '.ext-cal-evt',
	dateRangeFormat: '{0} - {1}',
	dateFormat: 'n/j',

    // private
    shims: [],

    getTargetFromEvent: function(e) {
		var dragOffset = this.dragOffset || 0,
				y = e.getY() - dragOffset,
				d = this.view.getDayAt(e.getX(), y);
		return d.el ? d : null;
	},

    onNodeOver: function(n, dd, e, data) {
        var me = this,
				XDate = Ext.Date,
				SoDate = Sonicle.Date,
				copy = e.ctrlKey || e.altKey,
				eventDragText = copy ? me.copyText: me.moveText,
				start = (data.type === 'eventdrag') ? n.date: SoDate.min(data.start, n.date),
				end = (data.type === 'eventdrag') ? XDate.add(n.date, XDate.DAY, SoDate.diffDays(data.eventStart, data.eventEnd), true) : SoDate.max(data.start, n.date);

        if (!me.dragStartDate || !me.dragEndDate || (SoDate.diffDays(start, me.dragStartDate) !== 0) || (SoDate.diffDays(end, me.dragEndDate) !== 0)) {
            me.dragStartDate = start;
			me.dragEndDate = XDate.clearTime(SoDate.add(end, {days: 1, millis: -1}, true));
            me.shim(start, end);
			
            var range = XDate.format(start, me.dateFormat);
            if (SoDate.diffDays(start, end) > 0) {
				end = XDate.format(end, me.dateFormat);
				range = Ext.String.format(me.dateRangeFormat, range, end);
            }
			me.currentRange = range;
        }
		
		//me.updateProxy(e, data, start, end);
		var msg = Ext.String.format((data.type === 'eventdrag') ? eventDragText : me.createText, me.currentRange);
		data.proxy.updateMsg(msg);
		return data.proxy.getDropAllowedCls(copy);
    },
	
	updateProxy: function(e, data, start, end) {
		var me = this,
				copy = false,
				text, dt;

		if (data.type === 'eventdrag') {
			copy = e.ctrlKey || e.altKey;
			text = (e.ctrlKey || e.altKey) ? me.copyText : me.moveText;
		} else {
			text = me.createText;
		}
		if (Sonicle.Date.diffDays(start, end) > 0) {
			dt = Ext.String.format(me.dateRangeFormat,
					Ext.Date.format(start, me.dateFormat),
					Ext.Date.format(end, me.dateFormat));
		} else {
			dt = Ext.Date.format(start, me.dateFormat);
		}

		data.proxy.updateMsg(Ext.String.format(text, dt));
		return data.proxy.getDropAllowedCls(copy);
	},

    shim: function(start, end) {
		var me = this,
				XDate = Ext.Date,
				SoDate = Sonicle.Date,
				dt = Ext.Date.clone(start),
				cnt = SoDate.diffDays(dt, end) + 1,
				i = 0,
				shim,
				box;

		me.currWeek = -1;
		me.DDMInstance.notifyOccluded = true;

		Ext.each(me.shims, function (shim) {
			if (shim) shim.isActive = false;
		});

		while (i++ < cnt) {
			var dayEl = me.view.getDayEl(dt);

			// if the date is not in the current view ignore it (this
			// can happen when an event is dragged to the end of the
			// month so that it ends outside the view)
			if (dayEl) {
				var wk = me.view.getWeekIndex(dt);
				shim = me.shims[wk];

				if (!shim) {
					shim = me.createShim();
					me.shims[wk] = shim;
				}
				if (wk !== me.currWeek) {
					shim.boxInfo = dayEl.getBox();
					me.currWeek = wk;
				} else {
					box = dayEl.getBox();
					shim.boxInfo.right = box.right;
					shim.boxInfo.width = box.right - shim.boxInfo.x;
				}
				shim.isActive = true;
			}
			dt = XDate.add(dt, XDate.DAY, 1, true);
		}

		Ext.each(me.shims, function (shim) {
			if (shim) {
				if (shim.isActive) {
					shim.show();
					shim.setBox(shim.boxInfo);
				} else if (shim.isVisible()) {
					shim.hide();
				}
			}
		});
	},

    createShim: function() {
		var me = this;
		if (!me.shimCt) {
			me.shimCt = Ext.get('ext-dd-shim-ct');
			if (!me.shimCt) {
				me.shimCt = document.createElement('div');
				me.shimCt.id = 'ext-dd-shim-ct';
				Ext.getBody().appendChild(me.shimCt);
			}
		}
		var el = document.createElement('div');
		el.className = 'ext-dd-shim';
		me.shimCt.appendChild(el);

		el = Ext.get(el);
		el.setVisibilityMode(2);

		return el;
	},

    clearShims: function() {
		Ext.each(this.shims, function (shim) {
			if (shim) shim.hide();
		});
		this.DDMInstance.notifyOccluded = false;
	},
	
	onContainerOver: function (dd, e, data) {
		return this.dropAllowed;
	},

    onCalendarDragComplete: function () {
		var me = this;
		delete me.dragStartDate;
		delete me.dragEndDate;
		me.clearShims();
	},

    onNodeDrop: function(n, dd, e, data) {
		var me = this,
				XDate = Ext.Date,
				SoDate = Sonicle.Date;
		if (n && data) {
			if (data.type === 'eventdrag') {
				var rec = me.view.getEventRecordFromEl(data.ddel),
						dt = SoDate.copyTime(rec.data[Sonicle.calendar.data.EventMappings.StartDate.name], n.date);

				me.view.onEventDrop(rec, dt, (e.ctrlKey || e.altKey) ? 'copy' : 'move');
				me.onCalendarDragComplete();
				return true;

			} else if (data.type === 'caldrag') {
				if (!me.dragEndDate) {
					// this can occur on a long click where drag starts but onNodeOver is never executed
					me.dragStartDate = XDate.clearTime(data.start, true);
					me.dragEndDate = XDate.add(XDate.clone(me.dragStartDate), XDate.HOUR, 1, true);
				}

				me.view.onCalendarEndDrag(me.dragStartDate, me.dragEndDate,
						Ext.bind(me.onCalendarDragComplete, me));
				//shims are NOT cleared here -- they stay visible until the handling
				//code calls the onCalendarDragComplete callback which hides them.
				return true;
			}
		}
		me.onCalendarDragComplete();
		return false;
	},

    onContainerDrop: function(dd, e, data) {
		this.onCalendarDragComplete();
		return false;
	},
	
	destroy: function() {
		var me = this;
		Ext.each(me.shims, function (shim) {
			if (shim) Ext.destroy(shim);
		});
		Ext.removeNode(me.shimCt);
		delete me.shimCt;
		me.shims.length = 0;
	}
});

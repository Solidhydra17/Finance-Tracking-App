package com.kuripot.app

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "NotificationSettings")
class NotificationSettingsPlugin : Plugin() {

  @PluginMethod
  fun openChannelSettings(call: PluginCall) {
    val activity = activity as? MainActivity
    activity?.openNotificationChannelSettings()
    call.resolve()
  }
}
